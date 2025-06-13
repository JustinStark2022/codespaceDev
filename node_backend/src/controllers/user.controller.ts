// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { db } from "@/db/db";
import { users, child_profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import logger from "@/utils/logger";
import bcrypt from "bcrypt";
import { screen_time } from "@/db/schema";
import { lesson_progress } from "@/db/schema";
import { getProfilePictureUrl } from "@/middleware/upload.middleware";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const getUser = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    logger.warn("getUser called without authenticated user.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!result.length) {
      logger.warn({ userId }, "User not found in DB for getUser.");
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...safeUser } = result[0];
    logger.debug({ userId }, "Successfully fetched user details for getUser.");
    res.json(safeUser);
  } catch (err: any) {
    logger.error(err, { userId }, "Error fetching user in getUser.");
    return res.status(500).json({ message: "Failed to fetch user details." });
  }
};

export const getChildren = async (req: AuthenticatedRequest, res: Response) => {
  const parentId = req.user?.id;
  if (!parentId) {
    logger.warn("getChildren called without authenticated user (parent).");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const children = await db.select().from(users).where(eq(users.parent_id, parentId));
    logger.info({ parentId, count: children.length }, "Fetched children for parent.");

    // For each child, fetch screen time, lesson progress metrics, and profile data
    const results = await Promise.all(
      children.map(async (child) => {
        // Screen time record
        const [screenTime] = await db
          .select()
          .from(screen_time)
          .where(eq(screen_time.user_id, child.id));

        // Lesson progress
        const progress = await db
          .select()
          .from(lesson_progress)
          .where(eq(lesson_progress.user_id, child.id));

        // Child profile data
        const [childProfile] = await db
          .select()
          .from(child_profiles)
          .where(eq(child_profiles.user_id, child.id))
          .limit(1);

        const completedCount = progress.filter(p => p.completed).length;

        return {
          ...child,
          screenTime: screenTime || null,
          totalLessons: progress.length,
          completedLessons: completedCount,
          profile: childProfile || null,
        };
      })
    );
    logger.debug({ parentId }, "Successfully fetched children details with metrics.");
    res.json(results);
  } catch (err: any) {
    logger.error(err, { parentId }, "Error fetching children for parent.");
    return res.status(500).json({ message: "Failed to fetch children." });
  }
};

export const createChild = async (req: AuthenticatedRequest, res: Response) => {
  const { username, password, email, display_name, first_name, last_name, age } = req.body;
  // Role is implicitly 'child' when created by a parent
  const role = "child";

  const parentId = req.user?.id;
  const profilePictureFile = req.file; // Multer adds this

  if (!parentId) {
    logger.warn("createChild called by unauthenticated user.");
    return res.status(401).json({ message: "Unauthorized: Parent not authenticated" });
  }

  if (!username || !password || !display_name || !first_name || !last_name || !age) {
    logger.warn({ parentId, body: req.body }, "Missing required fields for createChild.");
    return res.status(400).json({ message: "Missing required fields including age" });
  }

  // Validate age
  const childAge = parseInt(age);
  if (isNaN(childAge) || childAge < 1 || childAge > 18) {
    logger.warn({ parentId, age }, "Invalid age provided for createChild.");
    return res.status(400).json({ message: "Age must be between 1 and 18" });
  }

  try {
    // Check if username exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (existingUser.length > 0) {
      logger.warn({ parentId, childUsername: username }, "Attempt to create child with existing username.");
      return res.status(400).json({ message: "Username already taken." });
    }

    // Check if email exists (optional, depending on requirements for child accounts)
    if (email) {
        const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

        if (existingEmail.length > 0) {
        logger.warn({ parentId, childEmail: email }, "Attempt to create child with existing email.");
        return res.status(400).json({ message: "Email already registered." });
        }
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account
    const inserted = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email: email || null, // Make email optional for children or ensure it's provided
        display_name,
        role,
        parent_id: parentId,
        first_name,
        last_name,
      })
      .returning();

    if (!Array.isArray(inserted) || inserted.length === 0) {
      logger.error({ parentId, childUsername: username }, "Failed to insert new child user into DB.");
      return res.status(500).json({ message: "Failed to create user" });
    }

    const createdChild = inserted[0];

    // Create child profile with age and profile picture
    let profilePictureUrl = null;
    if (profilePictureFile) {
      profilePictureUrl = getProfilePictureUrl(profilePictureFile.filename);
    }

    const childProfileData = {
      user_id: createdChild.id,
      parent_id: parentId,
      age: childAge,
      profile_picture: profilePictureUrl,
      interests: null,
      restrictions: null,
      emergency_contacts: null,
      favorite_bible_verse: null
    };

    try {
      await db.insert(child_profiles).values(childProfileData);
      logger.info({
        parentId,
        childId: createdChild.id,
        childUsername: createdChild.username,
        age: childAge,
        hasProfilePicture: !!profilePictureFile
      }, "Child account and profile created successfully.");
    } catch (profileError) {
      logger.error(profileError, { parentId, childId: createdChild.id }, "Failed to create child profile, but user was created.");
      // Continue - user was created successfully even if profile creation failed
    }

    const { password: _, ...safeChild } = createdChild; // Exclude password from response

    // Include profile information in response
    const response = {
      ...safeChild,
      age: childAge,
      profile_picture: profilePictureUrl
    };

    res.status(201).json(response);

  } catch (err: any) {
    logger.error(err, { parentId, body: req.body }, "Error creating child account.");
    // Consider if ZodError can happen here if input validation is added
    return res.status(500).json({ message: "Failed to create child account." });
  }
};

// Get child profile data
export const getChildProfile = async (req: AuthenticatedRequest, res: Response) => {
  const userId = parseInt(req.params.userId);
  const requestingUserId = req.user?.id;

  if (!requestingUserId) {
    logger.warn("getChildProfile called without authenticated user.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user is requesting their own profile or is a parent requesting child's profile
  if (userId !== requestingUserId) {
    // Check if requesting user is the parent of this child
    const [childUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!childUser || childUser.parent_id !== requestingUserId) {
      logger.warn({ requestingUserId, userId }, "Unauthorized access to child profile.");
      return res.status(403).json({ message: "Access denied" });
    }
  }

  try {
    // Get child profile data
    const [childProfile] = await db
      .select()
      .from(child_profiles)
      .where(eq(child_profiles.user_id, userId))
      .limit(1);

    if (!childProfile) {
      logger.warn({ userId }, "Child profile not found.");
      return res.status(404).json({ message: "Child profile not found" });
    }

    logger.info({ userId, requestingUserId }, "Child profile fetched successfully.");
    res.json(childProfile);

  } catch (err: any) {
    logger.error(err, { userId, requestingUserId }, "Error fetching child profile.");
    return res.status(500).json({ message: "Failed to fetch child profile." });
  }
};

// Update child profile data
export const updateChildProfile = async (req: AuthenticatedRequest, res: Response) => {
  const userId = parseInt(req.params.userId);
  const requestingUserId = req.user?.id;
  const { age, profile_picture, grade_level, favorite_bible_verse, interests, restrictions } = req.body;

  if (!requestingUserId) {
    logger.warn("updateChildProfile called without authenticated user.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user is updating their own profile or is a parent updating child's profile
  if (userId !== requestingUserId) {
    // Check if requesting user is the parent of this child
    const [childUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!childUser || childUser.parent_id !== requestingUserId) {
      logger.warn({ requestingUserId, userId }, "Unauthorized access to update child profile.");
      return res.status(403).json({ message: "Access denied" });
    }
  }

  try {
    // Check if profile exists
    const [existingProfile] = await db
      .select()
      .from(child_profiles)
      .where(eq(child_profiles.user_id, userId))
      .limit(1);

    if (existingProfile) {
      // Update existing profile
      const [updatedProfile] = await db
        .update(child_profiles)
        .set({
          age: age !== undefined ? age : existingProfile.age,
          profile_picture: profile_picture !== undefined ? profile_picture : existingProfile.profile_picture,
          grade_level: grade_level !== undefined ? grade_level : existingProfile.grade_level,
          favorite_bible_verse: favorite_bible_verse !== undefined ? favorite_bible_verse : existingProfile.favorite_bible_verse,
          interests: interests !== undefined ? interests : existingProfile.interests,
          restrictions: restrictions !== undefined ? restrictions : existingProfile.restrictions,
          updated_at: new Date()
        })
        .where(eq(child_profiles.user_id, userId))
        .returning();

      logger.info({ userId, requestingUserId }, "Child profile updated successfully.");
      res.json(updatedProfile);
    } else {
      // Create new profile if it doesn't exist
      const [childUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!childUser || !childUser.parent_id) {
        return res.status(400).json({ message: "Cannot create profile - user not found or no parent assigned" });
      }

      const [newProfile] = await db
        .insert(child_profiles)
        .values({
          user_id: userId,
          parent_id: childUser.parent_id,
          age: age || null,
          profile_picture: profile_picture || null,
          grade_level: grade_level || null,
          favorite_bible_verse: favorite_bible_verse || null,
          interests: interests || null,
          restrictions: restrictions || null
        })
        .returning();

      logger.info({ userId, requestingUserId }, "Child profile created successfully.");
      res.json(newProfile);
    }

  } catch (err: any) {
    logger.error(err, { userId, requestingUserId }, "Error updating child profile.");
    return res.status(500).json({ message: "Failed to update child profile." });
  }
};

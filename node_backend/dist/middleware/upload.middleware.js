import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/profile-pictures');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random string
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `profile-${uniqueSuffix}${extension}`);
    }
});
// File filter to only allow images
const fileFilter = (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files are allowed!'));
    }
};
// Configure multer
export const uploadProfilePicture = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: fileFilter
});
// Middleware to handle single profile picture upload
export const uploadSingle = uploadProfilePicture.single('profilePicture');
// Helper function to get profile picture URL
export const getProfilePictureUrl = (filename) => {
    return `/uploads/profile-pictures/${filename}`;
};
// Helper function to delete profile picture file
export const deleteProfilePicture = (filename) => {
    try {
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    catch (error) {
        console.error('Error deleting profile picture:', error);
    }
};

import fs from 'fs';
import path from 'path';
import multer from 'multer';

export const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
export const PROFILE_PHOTOS_DIR = path.join(UPLOADS_ROOT, 'profile-photos');

fs.mkdirSync(PROFILE_PHOTOS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROFILE_PHOTOS_DIR);
  },
  filename: (req: any, file, cb) => {
    const adminId = req.admin?.admin_id ?? 'unknown';
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `admin-${adminId}-${Date.now()}${ext}`);
  },
});

export function deleteProfilePhotoFile(profilePhoto: string | null | undefined) {
  if (!profilePhoto) return;
  const filePath = path.join(PROFILE_PHOTOS_DIR, path.basename(profilePhoto));
  fs.unlink(filePath, () => {
    // Best-effort cleanup — a missing file is not an error here.
  });
}

export const profilePhotoUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'));
      return;
    }
    cb(null, true);
  },
});

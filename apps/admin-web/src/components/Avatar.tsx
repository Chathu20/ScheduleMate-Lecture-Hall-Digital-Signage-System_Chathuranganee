import { API_ORIGIN } from '../lib/apiClient';
import { colors } from '../theme';

interface AvatarProps {
  username?: string;
  photoUrl?: string | null;
  size?: number;
  fontSize?: number;
}

export function resolvePhotoUrl(photoUrl?: string | null) {
  if (!photoUrl) return null;
  return `${API_ORIGIN}${photoUrl}`;
}

export function Avatar({ username, photoUrl, size = 34, fontSize = 12 }: AvatarProps) {
  const src = resolvePhotoUrl(photoUrl);
  const initials = username ? username.slice(0, 2).toUpperCase() : '?';

  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', backgroundColor: '#3a5a9c',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 700,
        color: '#fff', overflow: 'hidden', flexShrink: 0, border: `1px solid ${colors.border}`,
      }}
    >
      {src ? (
        <img src={src} alt={username || 'Profile'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials
      )}
    </div>
  );
}

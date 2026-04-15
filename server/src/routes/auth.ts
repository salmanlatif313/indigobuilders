import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { runQuery, runQueryResult } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

interface UserRow {
  UserID: number;
  Username: string;
  PasswordHash: string;
  FullName: string;
  Email: string;
  RoleID: number;
  RoleName: string;
  IsActive: boolean;
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  try {
    const rows = await runQuery<UserRow>(
      `SELECT u.UserID, u.Username, u.PasswordHash, u.FullName, u.Email,
              u.RoleID, r.RoleName, u.IsActive
       FROM Users u
       JOIN Roles r ON r.RoleID = u.RoleID
       WHERE u.Username = @username`,
      { username }
    );
    const user = rows[0];
    if (!user || !user.IsActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign(
      { userId: user.UserID, username: user.Username, roleId: user.RoleID, roleName: user.RoleName, fullName: user.FullName },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'] }
    );
    res.json({
      token,
      user: { userId: user.UserID, username: user.Username, fullName: user.FullName, email: user.Email, roleId: user.RoleID, roleName: user.RoleName },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// GET /api/auth/roles
router.get('/roles', requireAuth, async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery<{ RoleID: number; RoleName: string }>(`SELECT RoleID, RoleName FROM Roles ORDER BY RoleID`);
    res.json({ roles: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/users  (Admin only)
router.get('/users', requireAuth, async (req: Request, res: Response) => {
  if (req.user?.roleName !== 'Admin') { res.status(403).json({ error: 'Admin only' }); return; }
  try {
    const rows = await runQuery<{ UserID: number; Username: string; FullName: string; Email: string; RoleID: number; RoleName: string; IsActive: boolean }>(
      `SELECT u.UserID, u.Username, u.FullName, u.Email, u.RoleID, r.RoleName, u.IsActive
       FROM Users u JOIN Roles r ON r.RoleID = u.RoleID ORDER BY u.FullName`
    );
    res.json({ users: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/users  (Admin only)
router.post('/users', requireAuth, async (req: Request, res: Response) => {
  if (req.user?.roleName !== 'Admin') { res.status(403).json({ error: 'Admin only' }); return; }
  const { username, password, fullName, email, roleId } = req.body as {
    username: string; password: string; fullName: string; email: string; roleId: number;
  };
  if (!username || !password || !roleId) { res.status(400).json({ error: 'username, password, roleId required' }); return; }
  try {
    const hash = await bcrypt.hash(password, 12);
    await runQueryResult(
      `INSERT INTO Users (Username, PasswordHash, FullName, Email, RoleID, ChangedBy)
       VALUES (@username, @hash, @fullName, @email, @roleId, @changedBy)`,
      { username, hash, fullName: fullName || '', email: email || '', roleId, changedBy: req.user?.username }
    );
    res.status(201).json({ message: 'User created' });
  } catch (err: unknown) {
    const e = err as { number?: number };
    if (e.number === 2627) { res.status(409).json({ error: 'Username already exists' }); }
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
});

// PUT /api/auth/users/:id  (Admin only)
router.put('/users/:id', requireAuth, async (req: Request, res: Response) => {
  if (req.user?.roleName !== 'Admin') { res.status(403).json({ error: 'Admin only' }); return; }
  const { id } = req.params;
  const { fullName, email, roleId, isActive } = req.body as { fullName?: string; email?: string; roleId?: number; isActive?: boolean };
  try {
    await runQueryResult(
      `UPDATE Users SET FullName=@fullName, Email=@email, RoleID=@roleId, IsActive=@isActive,
       ChangedBy=@changedBy, ChangeDate=GETDATE() WHERE UserID=@id`,
      { id: parseInt(id), fullName, email, roleId, isActive: isActive ? 1 : 0, changedBy: req.user?.username }
    );
    res.json({ message: 'User updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/me/password  — change own password
router.put('/me/password', requireAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'currentPassword and newPassword (min 6 chars) required' }); return;
  }
  try {
    const rows = await runQuery<{ PasswordHash: string }>(
      `SELECT PasswordHash FROM Users WHERE UserID = @id`, { id: req.user?.userId }
    );
    if (!rows[0]) { res.status(404).json({ error: 'User not found' }); return; }
    const valid = await bcrypt.compare(currentPassword, rows[0].PasswordHash);
    if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }
    const hash = await bcrypt.hash(newPassword, 12);
    await runQueryResult(
      `UPDATE Users SET PasswordHash=@hash, ChangedBy=@changedBy, ChangeDate=GETDATE() WHERE UserID=@id`,
      { id: req.user?.userId, hash, changedBy: req.user?.username }
    );
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/users/:id/reset-password  (Admin only)
router.put('/users/:id/reset-password', requireAuth, async (req: Request, res: Response) => {
  if (req.user?.roleName !== 'Admin') { res.status(403).json({ error: 'Admin only' }); return; }
  const { newPassword } = req.body as { newPassword: string };
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'newPassword (min 6 chars) required' }); return;
  }
  try {
    const hash = await bcrypt.hash(newPassword, 12);
    await runQueryResult(
      `UPDATE Users SET PasswordHash=@hash, ChangedBy=@changedBy, ChangeDate=GETDATE() WHERE UserID=@id`,
      { id: parseInt(req.params.id), hash, changedBy: req.user?.username }
    );
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

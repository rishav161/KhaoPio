import { Request, Response } from 'express';
import authService from '../services/auth.service';
import emailService from '../services/email.service';
import { RoleName } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, restaurantName, menuItems } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Fields "name", "email", and "password" are required.' });
      return;
    }

    const result = await authService.registerFirstAdmin({
      name,
      email,
      passwordHash: password,
      restaurantName,
      menuItems,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error registering admin.' });
  }
};

export const loginEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Fields "email" and "password" are required.' });
      return;
    }

    const result = await authService.loginWithEmail({
      email,
      passwordHash: password,
    });

    res.status(200).json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Invalid credentials.' });
  }
};

export const inviteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      res.status(400).json({ error: 'Fields "email" and "role" are required.' });
      return;
    }

    // Verify role belongs to valid RoleNames
    const validRoles = Object.values(RoleName);
    if (!validRoles.includes(role as RoleName)) {
      res.status(400).json({ error: `Invalid role: ${role}. Choose from: ${validRoles.join(', ')}` });
      return;
    }

    const restaurantId = (req as AuthenticatedRequest).user?.restaurantId;
    const invitation = await authService.createInvitation(email, role as RoleName, restaurantId);
    
    // Automatically trigger email dispatch via Mailgun
    const emailSent = await emailService.sendInvitationEmail(invitation.email, invitation.token, invitation.role.name);
    const message = emailSent 
      ? 'Invitation generated and email dispatched successfully.' 
      : 'Invitation generated successfully (email service skipped or failed).';

    res.status(201).json({
      message,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role.name,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error creating invitation.' });
  }
};

export const verifyInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({ error: 'Token parameter is required.' });
      return;
    }

    const invitation = await authService.verifyInvitationToken(token);
    res.status(200).json({
      email: invitation.email,
      role: invitation.role.name,
      expiresAt: invitation.expiresAt,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const acceptInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, name, pin, password } = req.body;

    if (!token || !name) {
      res.status(400).json({ error: 'Fields "token" and "name" are required.' });
      return;
    }

    const newUser = await authService.acceptInvitation({
      token,
      name,
      pin,
      password,
    });

    res.status(201).json({
      message: 'Invitation accepted. User created successfully.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error accepting invitation.' });
  }
};

export const getStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const staffList = await authService.getStaffList();
    res.status(200).json(staffList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching staff.' });
  }
};

export const loginPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      res.status(400).json({ error: 'Fields "email" and "pin" are required.' });
      return;
    }

    const result = await authService.loginWithPin({ email, pin });
    res.status(200).json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Invalid PIN login.' });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await authService.getAllUsersDetails();
    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching users.' });
  }
};

export const updateUserByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, role, status } = req.body;
    const updatedUser = await authService.updateUserDetail(id, { name, role, status });
    res.status(200).json(updatedUser);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error updating user.' });
  }
};

export const deleteUserByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await authService.deleteUser(id);
    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error deleting user.' });
  }
};

export const initRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Field "email" is required.' });
      return;
    }

    const result = await authService.initializeAdminRegistration(email);
    res.status(200).json({
      message: 'OTP verification code generated and dispatched.',
      otp: result.otp,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error sending verification code.' });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ error: 'Fields "email" and "otp" are required.' });
      return;
    }

    await authService.verifyAdminOtp(email, otp);
    res.status(200).json({ message: 'Email address verified successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error verifying OTP.' });
  }
};



import { User } from '@prisma/client';
import prisma from '../lib/prisma';
import redis from '../lib/redis';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      throw new AppError(
        `Account is locked. Please try again in ${remainingTime} minutes`,
        423
      );
    }

    // Check if account is suspended
    if (user.isSuspended) {
      throw new AppError('Account is suspended. Please contact support', 403);
    }

    // Verify password
    const isValidPassword = await comparePassword(input.password, user.password);

    if (!isValidPassword) {
      // Increment login attempts
      const loginAttempts = user.loginAttempts + 1;
      const updateData: any = { loginAttempts };

      // Lock account if max attempts reached
      if (loginAttempts >= config.security.maxLoginAttempts) {
        updateData.lockedUntil = new Date(Date.now() + config.security.lockoutDuration);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new AppError('Invalid credentials', 401);
    }

    // Reset login attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: input.ipAddress,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: uuidv4(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Find refresh token in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      throw new AppError('Refresh token expired', 401);
    }

    // Check if token is revoked
    if (tokenRecord.revokedAt) {
      throw new AppError('Refresh token has been revoked', 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken(tokenRecord.user.id, tokenRecord.user.email);

    return { accessToken };
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<void> {
    // Revoke refresh token
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export const authService = new AuthService();

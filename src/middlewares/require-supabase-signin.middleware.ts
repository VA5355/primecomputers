import type {
    Request,
    Response,
    NextFunction
} from "express";

import { supabaseAdmin } from "../config/supabase.js";

export interface SupabaseAuthenticatedRequest extends Request {
    supabaseUser?: {
        id: string;
        email?: string;
    };
}

export async function requireSupabaseSignin(
    req: SupabaseAuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authorization = req.headers.authorization;

        if (!authorization?.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Supabase authentication token is required."
            });
            return;
        }

        const accessToken = authorization.substring(7).trim();

        if (!accessToken) {
            res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
            return;
        }

        const {
            data: { user },
            error
        } = await supabaseAdmin.auth.getUser(accessToken);

        if (error || !user) {
            res.status(401).json({
                success: false,
                message: "Supabase session is invalid or expired."
            });
            return;
        }

        req.supabaseUser = {
            id: user.id,
            email: user.email
        };

        next();

    } catch (error) {
        next(error);
    }
}
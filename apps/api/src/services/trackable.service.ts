import OpenAI from "openai";
import { prisma } from "../lib/prisma.js";
import { PrismaClient } from "../generated/prisma/client.js";
import { VALID_ICON_NAMES } from "../data/valid-icons.js";

type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Get all trackables for a user, sorted by sortOrder, with their active goals
 */
export async function getUserTrackables(userId: string) {
  const trackables = await prisma.trackableItem.findMany({
    where: { userId },
    include: {
      goals: {
        where: { endDate: null },
        take: 1,
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return trackables.map((trackable) => ({
    id: trackable.id,
    name: trackable.name,
    icon: trackable.icon,
    color: trackable.color,
    trackingType: trackable.trackingType,
    unit: trackable.unit,
    isSystem: trackable.isSystem,
    isActive: trackable.isActive,
    sortOrder: trackable.sortOrder,
    goal: trackable.goals[0] || null,
  }));
}

/**
 * Create a custom trackable item (isSystem = false, source = manual)
 */
export async function createTrackable(
  userId: string,
  data: {
    name: string;
    icon: string;
    color: string;
    trackingType: "boolean" | "number" | "duration";
    unit?: string;
  }
) {
  // Get the max sortOrder for custom items to place new item at the end
  const maxSortOrder = await prisma.trackableItem.findFirst({
    where: { userId, isSystem: false },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const sortOrder = maxSortOrder ? maxSortOrder.sortOrder + 1 : 100;

  return await prisma.trackableItem.create({
    data: {
      userId,
      name: data.name,
      icon: data.icon,
      color: data.color,
      trackingType: data.trackingType,
      unit: data.unit,
      isSystem: false,
      isActive: true,
      sortOrder,
    },
  });
}

/**
 * Update a trackable item (name, icon, color, isActive, sortOrder)
 */
export async function updateTrackable(
  userId: string,
  trackableId: string,
  data: {
    name?: string;
    icon?: string;
    color?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  // Verify ownership
  const trackable = await prisma.trackableItem.findFirst({
    where: { id: trackableId, userId },
  });

  if (!trackable) {
    return null;
  }

  return await prisma.trackableItem.update({
    where: { id: trackableId },
    data,
  });
}

/**
 * Delete a custom trackable (403 if isSystem = true)
 */
export async function deleteTrackable(userId: string, trackableId: string) {
  // Verify ownership and check if system
  const trackable = await prisma.trackableItem.findFirst({
    where: { id: trackableId, userId },
  });

  if (!trackable) {
    return { success: false, reason: "not_found" };
  }

  if (trackable.isSystem) {
    return { success: false, reason: "system_trackable" };
  }

  await prisma.trackableItem.delete({
    where: { id: trackableId },
  });

  return { success: true };
}

/**
 * Create a goal for a trackable, auto-closing any previous active goal
 */
export async function createGoal(
  userId: string,
  trackableId: string,
  data: {
    targetValue: number;
    frequency: "daily" | "weekly" | "monthly";
  }
) {
  // Verify ownership
  const trackable = await prisma.trackableItem.findFirst({
    where: { id: trackableId, userId },
  });

  if (!trackable) {
    return null;
  }

  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    // Close any existing active goal (set endDate to now)
    await tx.trackableGoal.updateMany({
      where: { trackableId, endDate: null },
      data: { endDate: new Date() },
    });

    // Create new goal
    return await tx.trackableGoal.create({
      data: {
        trackableId,
        targetValue: data.targetValue,
        frequency: data.frequency,
      },
    });
  });
}

/**
 * Update a goal (targetValue, frequency, endDate)
 */
export async function updateGoal(
  userId: string,
  trackableId: string,
  goalId: string,
  data: {
    targetValue?: number;
    frequency?: "daily" | "weekly" | "monthly";
    endDate?: string;
  }
) {
  // Verify ownership through trackable
  const trackable = await prisma.trackableItem.findFirst({
    where: { id: trackableId, userId },
  });

  if (!trackable) {
    return null;
  }

  // Verify goal exists for this trackable
  const goal = await prisma.trackableGoal.findFirst({
    where: { id: goalId, trackableId },
  });

  if (!goal) {
    return null;
  }

  return await prisma.trackableGoal.update({
    where: { id: goalId },
    data: {
      targetValue: data.targetValue,
      frequency: data.frequency,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
}

/**
 * Bulk update sortOrder for multiple trackables
 */
export async function reorderTrackables(
  userId: string,
  items: Array<{ id: string; sortOrder: number }>
) {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    // Verify all trackables belong to user
    const trackableIds = items.map((item) => item.id);
    const trackables = await tx.trackableItem.findMany({
      where: { id: { in: trackableIds }, userId },
      select: { id: true },
    });

    if (trackables.length !== items.length) {
      throw new Error("Some trackables not found or do not belong to user");
    }

    // Update each item's sortOrder
    for (const item of items) {
      await tx.trackableItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      });
    }

    return { success: true, updated: items.length };
  });
}

/**
 * Ensure sleep trackable has a default goal for existing users.
 * This is called on-demand (e.g., when user accesses trackables endpoint for the first time after migration).
 */
export async function ensureSleepGoal(userId: string) {
  const sleepTrackable = await prisma.trackableItem.findFirst({
    where: { userId, name: "Durée sommeil", isSystem: true },
    include: {
      goals: {
        where: { endDate: null },
      },
    },
  });

  // If sleep trackable exists but has no active goal, create one
  if (sleepTrackable && sleepTrackable.goals.length === 0) {
    await prisma.trackableGoal.create({
      data: {
        trackableId: sleepTrackable.id,
        targetValue: 480, // 8 hours in minutes
        frequency: "daily",
      },
    });
  }
}

const FALLBACK_ICONS = ["target", "star", "circle-dot", "heart", "zap"];

/**
 * Suggest icons and a color for a trackable name using OpenAI.
 * gpt-4o-mini proposes freely, then we validate server-side against the known icon set.
 * Returns exactly 5 validated icon names and a hex color.
 */
export async function suggestIcons(name: string): Promise<{ icons: string[]; color: string }> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: `You suggest Lucide icons for a habit/activity tracker.

Icons come from the Lucide icon library (lucide.dev/icons) and @lucide/lab.
Use kebab-case names exactly as on lucide.dev (e.g. "dumbbell", "heart-pulse", "book-open", "flower-lotus", "brain", "moon", "flame", "footprints", "bike", "glass-water", "apple", "music", "bed", "timer", "trophy").

Return 15 icon name candidates and a hex color.
Respond ONLY with JSON, no markdown: {"icons":["i1","i2",..."i15"],"color":"#XXXXXX"}`,
      },
      {
        role: "user",
        content: `Suggest icons for: "${name}"`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    return { icons: FALLBACK_ICONS, color: "#3B82F6" };
  }

  try {
    const parsed = JSON.parse(content);
    const color = typeof parsed.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(parsed.color)
      ? parsed.color
      : "#3B82F6";

    // Validate each suggestion against our known-valid icon set
    const validIcons: string[] = [];
    if (Array.isArray(parsed.icons)) {
      for (const icon of parsed.icons) {
        if (typeof icon === "string" && VALID_ICON_NAMES.has(icon) && !validIcons.includes(icon)) {
          validIcons.push(icon);
          if (validIcons.length >= 5) break;
        }
      }
    }

    // Pad with fallbacks if needed
    for (const fallback of FALLBACK_ICONS) {
      if (validIcons.length >= 5) break;
      if (!validIcons.includes(fallback)) {
        validIcons.push(fallback);
      }
    }

    return { icons: validIcons, color };
  } catch {
    return { icons: FALLBACK_ICONS, color: "#3B82F6" };
  }
}

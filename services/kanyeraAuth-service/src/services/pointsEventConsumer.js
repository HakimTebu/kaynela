const mongoose = require("mongoose");
const logger = require("../utils/logger");

class PointsEventConsumer {
  // Handle points sync events from loyalty service
  static async handlePointsSyncEvent(eventData) {
    try {
      logger.info("Processing points sync event:", eventData);

      const { userId, loyaltyPoints, loyaltyTier } = eventData;

      // Update user's loyalty points and tier
      await mongoose.model("User").findByIdAndUpdate(userId, {
        loyaltyPoints,
        loyaltyTier,
        $push: {
          loyaltyPointsHistory: {
            points: loyaltyPoints,
            action: "earned",
            source: "sync",
            description: "Points synchronized from loyalty service",
            timestamp: new Date(),
          },
        },
      });

      logger.info(
        `✅ Points synced for user ${userId}: ${loyaltyPoints} points, ${loyaltyTier} tier`
      );
    } catch (error) {
      logger.error("Error handling points sync event:", error);
      throw error;
    }
  }

  // Handle order points earned events
  static async handleOrderPointsEvent(eventData) {
    try {
      logger.info("Processing order points earned event:", eventData);

      const { userId, points, orderId, orderType } = eventData;

      // Update user's loyalty points
      const user = await mongoose.model("User").findByIdAndUpdate(
        userId,
        {
          $inc: { loyaltyPoints: points },
          $push: {
            loyaltyPointsHistory: {
              points,
              action: "earned",
              source: "booking",
              description: `Earned ${points} points from ${orderType} booking (${orderId})`,
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      );

      // Check if user should be upgraded to next tier
      const newTier = this.calculateLoyaltyTier(user.loyaltyPoints);
      if (newTier !== user.loyaltyTier) {
        await mongoose.model("User").findByIdAndUpdate(userId, {
          loyaltyTier: newTier,
          $push: {
            loyaltyPointsHistory: {
              points: 0,
              action: "bonus",
              source: "tier_upgrade",
              description: `Upgraded to ${newTier} tier`,
              timestamp: new Date(),
            },
          },
        });

        logger.info(`🎉 User ${userId} upgraded to ${newTier} tier!`);
      }

      logger.info(
        `✅ ${points} points added for user ${userId} from order ${orderId}`
      );
    } catch (error) {
      logger.error("Error handling order points event:", error);
      throw error;
    }
  }

  // Handle booking completed events (Kaynela Farms specific)
  static async handleBookingCompletedEvent(eventData) {
    try {
      logger.info("Processing booking completed event:", eventData);

      const { userId, bookingId, bookingType, amount, activityType } =
        eventData;

      // Calculate points based on booking type and amount
      const points = this.calculatePointsForBooking(
        bookingType,
        amount,
        activityType
      );

      // Update user's loyalty points and total spent
      const user = await mongoose.model("User").findByIdAndUpdate(
        userId,
        {
          $inc: {
            loyaltyPoints: points,
            totalSpent: amount,
          },
          $push: {
            loyaltyPointsHistory: {
              points,
              action: "earned",
              source: "booking",
              description: `Earned ${points} points from ${bookingType} booking (${bookingId})`,
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      );

      // Check for tier upgrade
      const newTier = this.calculateLoyaltyTier(user.loyaltyPoints);
      if (newTier !== user.loyaltyTier) {
        await mongoose.model("User").findByIdAndUpdate(userId, {
          loyaltyTier: newTier,
          $push: {
            loyaltyPointsHistory: {
              points: 0,
              action: "bonus",
              source: "tier_upgrade",
              description: `Upgraded to ${newTier} tier`,
              timestamp: new Date(),
            },
          },
        });

        logger.info(
          `🎉 User ${userId} upgraded to ${newTier} tier after booking completion!`
        );
      }

      logger.info(
        `✅ ${points} points added for user ${userId} from completed booking ${bookingId}`
      );
    } catch (error) {
      logger.error("Error handling booking completed event:", error);
      throw error;
    }
  }

  // Handle loyalty tier upgrade events
  static async handleLoyaltyTierUpgradeEvent(eventData) {
    try {
      logger.info("Processing loyalty tier upgrade event:", eventData);

      const { userId, oldTier, newTier, reason } = eventData;

      // Update user's loyalty tier
      await mongoose.model("User").findByIdAndUpdate(userId, {
        loyaltyTier: newTier,
        $push: {
          loyaltyPointsHistory: {
            points: 0,
            action: "bonus",
            source: "tier_upgrade",
            description: `Tier upgraded from ${oldTier} to ${newTier}${reason ? ` - ${reason}` : ""}`,
            timestamp: new Date(),
          },
        },
      });

      logger.info(
        `✅ User ${userId} tier upgraded from ${oldTier} to ${newTier}`
      );
    } catch (error) {
      logger.error("Error handling loyalty tier upgrade event:", error);
      throw error;
    }
  }

  // Calculate loyalty tier based on points
  static calculateLoyaltyTier(points) {
    if (points >= 10000) return "diamond";
    if (points >= 5000) return "platinum";
    if (points >= 2000) return "gold";
    if (points >= 500) return "silver";
    return "bronze";
  }

  // Calculate points for different booking types (Kaynela Farms specific)
  static calculatePointsForBooking(bookingType, amount, activityType) {
    let basePoints = Math.floor(amount * 0.1); // 10% of amount as base points

    // Bonus points for different booking types
    switch (bookingType) {
      case "lodging":
        basePoints *= 1.5; // 50% bonus for lodging
        break;
      case "activity":
        basePoints *= 1.2; // 20% bonus for activities
        break;
      case "event":
        basePoints *= 1.3; // 30% bonus for events
        break;
      case "farm_tour":
        basePoints *= 1.4; // 40% bonus for farm tours
        break;
      default:
        break;
    }

    // Activity-specific bonuses
    if (activityType) {
      switch (activityType) {
        case "cooking_classes":
          basePoints *= 1.1; // 10% bonus for cooking classes
          break;
        case "wine_tasting":
          basePoints *= 1.15; // 15% bonus for wine tasting
          break;
        case "horse_riding":
          basePoints *= 1.2; // 20% bonus for horse riding
          break;
        case "camping":
          basePoints *= 1.1; // 10% bonus for camping
          break;
        default:
          break;
      }
    }

    return Math.floor(basePoints);
  }
}

module.exports = PointsEventConsumer;

const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    // Basic booking information
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingType: {
      type: String,
      enum: ["lodging", "activity", "event", "farm_tour", "package"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "active", "completed", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },

    // Booking details
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // in days/hours
      required: true,
    },
    participants: {
      adults: {
        type: Number,
        default: 1,
        min: 1,
      },
      children: {
        type: Number,
        default: 0,
        min: 0,
      },
      seniors: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Pricing
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    taxes: {
      type: Number,
      default: 0,
      min: 0,
    },
    fees: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "KES",
      enum: ["KES", "USD", "EUR", "GBP"],
    },

    // Lodging specific fields
    lodging: {
      accommodationType: {
        type: String,
        enum: ["farmhouse", "cottage", "glamping", "camping", "guesthouse"],
      },
      roomNumber: String,
      amenities: [String],
      specialRequests: String,
      checkInTime: String,
      checkOutTime: String,
    },

    // Activity specific fields
    activity: {
      activityType: {
        type: String,
        enum: [
          "farm_tours",
          "animal_feeding",
          "crop_picking",
          "cooking_classes",
          "wine_tasting",
          "horse_riding",
          "fishing",
          "hiking",
          "camping",
        ],
      },
      instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      equipmentProvided: [String],
      skillLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
      },
      maxParticipants: Number,
      meetingPoint: String,
    },

    // Event specific fields
    event: {
      eventName: String,
      eventType: {
        type: String,
        enum: ["workshop", "festival", "celebration", "educational", "entertainment"],
      },
      eventCapacity: Number,
      eventLocation: String,
      eventDescription: String,
    },

    // Package specific fields
    package: {
      packageName: String,
      packageDescription: String,
      includedServices: [String],
      packageDuration: Number,
    },

    // Special requirements
    specialRequirements: {
      dietaryRestrictions: [{
        type: String,
        enum: ["vegetarian", "vegan", "gluten_free", "dairy_free", "nut_free", "halal", "kosher"],
      }],
      accessibilityNeeds: [{
        type: String,
        enum: ["wheelchair_access", "hearing_assistance", "visual_assistance", "mobility_support"],
      }],
      medicalConditions: String,
      allergies: [String],
      otherRequests: String,
    },

    // Payment information
    payment: {
      paymentMethod: {
        type: String,
        enum: ["mobile_money", "credit_card", "debit_card", "bank_transfer", "cash"],
        required: true,
      },
      paymentStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", "refunded"],
        default: "pending",
      },
      transactionId: String,
      paymentDate: Date,
      refundAmount: {
        type: Number,
        default: 0,
      },
      refundReason: String,
    },

    // Cancellation and refund
    cancellation: {
      isCancellable: {
        type: Boolean,
        default: true,
      },
      cancellationPolicy: {
        type: String,
        enum: ["flexible", "moderate", "strict", "non_refundable"],
        default: "moderate",
      },
      cancellationDeadline: Date,
      cancellationFee: {
        type: Number,
        default: 0,
      },
      cancelledAt: Date,
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      cancellationReason: String,
    },

    // Reviews and ratings
    review: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
      reviewDate: Date,
      photos: [String],
    },

    // Communication
    communication: {
      confirmationEmailSent: {
        type: Boolean,
        default: false,
      },
      reminderEmailSent: {
        type: Boolean,
        default: false,
      },
      followUpEmailSent: {
        type: Boolean,
        default: false,
      },
      smsNotifications: {
        type: Boolean,
        default: true,
      },
    },

    // Metadata
    source: {
      type: String,
      enum: ["website", "mobile_app", "phone", "walk_in", "travel_agent"],
      default: "website",
    },
    tags: [String],
    notes: String,
    internalNotes: String,

    // Timestamps
    confirmedAt: Date,
    completedAt: Date,
    lastModified: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
BookingSchema.index({ userId: 1, status: 1 });
BookingSchema.index({ startDate: 1, endDate: 1 });
BookingSchema.index({ bookingType: 1, status: 1 });
BookingSchema.index({ "lodging.accommodationType": 1 });
BookingSchema.index({ "activity.activityType": 1 });
BookingSchema.index({ "event.eventType": 1 });
BookingSchema.index({ totalAmount: 1 });
BookingSchema.index({ createdAt: -1 });

// Virtual for calculating total participants
BookingSchema.virtual("totalParticipants").get(function () {
  return (
    (this.participants?.adults || 0) +
    (this.participants?.children || 0) +
    (this.participants?.seniors || 0)
  );
});

// Virtual for calculating duration in days
BookingSchema.virtual("durationInDays").get(function () {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return this.duration;
});

// Pre-save middleware to generate booking ID
BookingSchema.pre("save", function (next) {
  if (this.isNew && !this.bookingId) {
    this.bookingId = `KF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

// Pre-save middleware to calculate total amount
BookingSchema.pre("save", function (next) {
  if (this.isModified("basePrice") || this.isModified("taxes") || this.isModified("fees") || this.isModified("discount")) {
    this.totalAmount = this.basePrice + this.taxes + this.fees - this.discount;
  }
  next();
});

// Static method to find active bookings
BookingSchema.statics.findActiveBookings = function (userId) {
  return this.find({
    userId,
    status: { $in: ["confirmed", "active"] },
    endDate: { $gte: new Date() },
  });
};

// Static method to find upcoming bookings
BookingSchema.statics.findUpcomingBookings = function (userId, limit = 10) {
  return this.find({
    userId,
    status: "confirmed",
    startDate: { $gte: new Date() },
  })
    .sort({ startDate: 1 })
    .limit(limit);
};

// Instance method to check if booking can be cancelled
BookingSchema.methods.canBeCancelled = function () {
  if (!this.cancellation.isCancellable) return false;
  if (this.cancellation.cancellationDeadline && new Date() > this.cancellation.cancellationDeadline) return false;
  return ["pending", "confirmed"].includes(this.status);
};

// Instance method to calculate cancellation fee
BookingSchema.methods.calculateCancellationFee = function () {
  if (!this.canBeCancelled()) return this.totalAmount;
  
  const daysUntilStart = Math.ceil((this.startDate - new Date()) / (1000 * 60 * 60 * 24));
  
  switch (this.cancellation.cancellationPolicy) {
    case "flexible":
      return daysUntilStart <= 1 ? this.totalAmount * 0.1 : 0;
    case "moderate":
      return daysUntilStart <= 3 ? this.totalAmount * 0.5 : daysUntilStart <= 7 ? this.totalAmount * 0.25 : 0;
    case "strict":
      return daysUntilStart <= 7 ? this.totalAmount * 0.75 : daysUntilStart <= 14 ? this.totalAmount * 0.5 : 0;
    case "non_refundable":
      return this.totalAmount;
    default:
      return 0;
  }
};

module.exports = mongoose.model("Booking", BookingSchema);

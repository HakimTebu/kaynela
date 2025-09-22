const mongoose = require("mongoose");
const { TICKET_STATUS, TICKET_TYPES, SEAT_TYPES } = require("../constants");

const TicketSchema = new mongoose.Schema(
  {
    // Basic ticket information
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Ticket details
    ticketType: {
      type: String,
      enum: Object.values(TICKET_TYPES),
      required: true,
    },
    
    status: {
      type: String,
      enum: Object.values(TICKET_STATUS),
      default: TICKET_STATUS.ACTIVE,
      index: true,
    },
    
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Seat information
    seatNumbers: [{
      type: String,
      trim: true,
    }],
    
    seatType: {
      type: String,
      enum: Object.values(SEAT_TYPES),
      default: SEAT_TYPES.GENERAL_ADMISSION,
    },
    
    // Special requirements
    specialRequests: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    
    accessibilityRequirements: [{
      type: String,
      enum: ["wheelchair", "hearing_assistance", "visual_assistance", "mobility_support"],
    }],
    
    dietaryRestrictions: [{
      type: String,
      enum: ["vegetarian", "vegan", "gluten_free", "dairy_free", "nut_free", "halal", "kosher"],
    }],
    
    // QR Code and validation
    qrCode: {
      data: String,
      format: {
        type: String,
        enum: ["png", "svg", "pdf"],
        default: "png",
      },
      size: {
        type: Number,
        default: 300,
      },
      generatedAt: Date,
      expiresAt: Date,
    },
    
    validationHistory: [{
      scannedAt: {
        type: Date,
        default: Date.now,
      },
      scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      location: {
        latitude: Number,
        longitude: Number,
        venue: String,
      },
      deviceInfo: {
        deviceId: String,
        deviceType: String,
        appVersion: String,
      },
      result: {
        type: String,
        enum: ["valid", "invalid", "already_used", "expired", "cancelled"],
      },
      notes: String,
    }],
    
    // Transfer and refund information
    transferHistory: [{
      fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      transferredAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      },
      reason: String,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    }],
    
    refundHistory: [{
      requestedAt: {
        type: Date,
        default: Date.now,
      },
      processedAt: Date,
      amount: Number,
      reason: {
        type: String,
        enum: ["cancellation", "postponement", "duplicate_purchase", "technical_issue", "customer_request", "event_cancelled", "medical_emergency", "travel_issue", "other"],
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "processed"],
      },
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      notes: String,
    }],
    
    // Payment information
    paymentId: {
      type: String,
      index: true,
    },
    
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile_money", "bank_transfer", "online", "invoice"],
    },
    
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "partially_refunded"],
      default: "pending",
    },
    
    // Loyalty and rewards
    loyaltyPointsEarned: {
      type: Number,
      default: 0,
    },
    
    loyaltyTier: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum", "diamond"],
      default: "bronze",
    },
    
    // Timestamps and metadata
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    
    expiresAt: {
      type: Date,
      required: true,
    },
    
    lastModifiedAt: {
      type: Date,
      default: Date.now,
    },
    
    // Cancellation and expiry
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: String,
    
    // Event attendance
    checkedInAt: Date,
    checkedOutAt: Date,
    attended: {
      type: Boolean,
      default: false,
    },
    
    // Additional metadata
    metadata: {
      source: {
        type: String,
        enum: ["web", "mobile", "phone", "walk_in", "partner"],
        default: "web",
      },
      campaign: String,
      referralCode: String,
      discountApplied: {
        type: Boolean,
        default: false,
      },
      discountAmount: {
        type: Number,
        default: 0,
      },
      discountCode: String,
    },
    
    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
TicketSchema.index({ eventId: 1, status: 1 });
TicketSchema.index({ userId: 1, status: 1 });
TicketSchema.index({ ticketNumber: 1 }, { unique: true });
TicketSchema.index({ qrCode: 1 });
TicketSchema.index({ expiresAt: 1 });
TicketSchema.index({ issuedAt: 1 });
TicketSchema.index({ "validationHistory.scannedAt": 1 });
TicketSchema.index({ "transferHistory.transferredAt": 1 });
TicketSchema.index({ "refundHistory.requestedAt": 1 });

// Virtual fields
TicketSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date();
});

TicketSchema.virtual("isValid").get(function () {
  return this.status === TICKET_STATUS.ACTIVE && !this.isExpired;
});

TicketSchema.virtual("canBeTransferred").get(function () {
  return this.status === TICKET_STATUS.ACTIVE && 
         this.transferHistory.every(t => t.status !== "pending");
});

TicketSchema.virtual("canBeRefunded").get(function () {
  return this.status === TICKET_STATUS.ACTIVE && 
         this.refundHistory.every(r => r.status !== "pending");
});

TicketSchema.virtual("validationCount").get(function () {
  return this.validationHistory.length;
});

TicketSchema.virtual("lastValidation").get(function () {
  if (this.validationHistory.length === 0) return null;
  return this.validationHistory[this.validationHistory.length - 1];
});

// Pre-save middleware
TicketSchema.pre("save", function (next) {
  this.lastModifiedAt = new Date();
  
  // Auto-generate ticket number if not provided
  if (!this.ticketNumber) {
    this.ticketNumber = generateTicketNumber();
  }
  
  // Set expiry date if not provided
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  }
  
  // Calculate total price
  if (this.unitPrice && this.quantity) {
    this.totalPrice = this.unitPrice * this.quantity;
  }
  
  // Increment version
  this.version += 1;
  
  next();
});

// Pre-validate middleware
TicketSchema.pre("validate", function (next) {
  // Validate seat numbers match quantity
  if (this.seatNumbers && this.seatNumbers.length > 0) {
    if (this.seatNumbers.length !== this.quantity) {
      this.invalidate("seatNumbers", "Number of seat numbers must match quantity");
    }
  }
  
  // Validate expiry date is in the future
  if (this.expiresAt && this.expiresAt <= new Date()) {
    this.invalidate("expiresAt", "Expiry date must be in the future");
  }
  
  next();
});

// Instance methods
TicketSchema.methods.validateTicket = function (scannedBy, location = null, deviceInfo = null) {
  const now = new Date();
  
  // Check if ticket is expired
  if (this.expiresAt < now) {
    this.addValidationRecord("expired", scannedBy, location, deviceInfo);
    return { valid: false, reason: "Ticket expired" };
  }
  
  // Check if ticket is already used
  if (this.status === TICKET_STATUS.USED) {
    this.addValidationRecord("already_used", scannedBy, location, deviceInfo);
    return { valid: false, reason: "Ticket already used" };
  }
  
  // Check if ticket is cancelled
  if (this.status === TICKET_STATUS.CANCELLED) {
    this.addValidationRecord("cancelled", scannedBy, location, deviceInfo);
    return { valid: false, reason: "Ticket cancelled" };
  }
  
  // Ticket is valid
  this.addValidationRecord("valid", scannedBy, location, deviceInfo);
  
  // Mark as used if this is the first valid validation
  if (this.status === TICKET_STATUS.ACTIVE) {
    this.status = TICKET_STATUS.USED;
    this.checkedInAt = now;
    this.attended = true;
  }
  
  return { valid: true, reason: "Ticket valid" };
};

TicketSchema.methods.addValidationRecord = function (result, scannedBy, location, deviceInfo) {
  this.validationHistory.push({
    scannedAt: new Date(),
    scannedBy,
    location,
    deviceInfo,
    result,
  });
};

TicketSchema.methods.requestTransfer = function (toUserId, reason) {
  if (!this.canBeTransferred) {
    throw new Error("Ticket cannot be transferred");
  }
  
  this.transferHistory.push({
    toUserId,
    reason,
    status: "pending",
  });
  
  return this.transferHistory[this.transferHistory.length - 1];
};

TicketSchema.methods.approveTransfer = function (transferIndex, approvedBy) {
  if (transferIndex >= this.transferHistory.length) {
    throw new Error("Invalid transfer index");
  }
  
  const transfer = this.transferHistory[transferIndex];
  transfer.status = "approved";
  transfer.approvedBy = approvedBy;
  
  // Update ticket owner
  this.userId = transfer.toUserId;
  
  return transfer;
};

TicketSchema.methods.requestRefund = function (reason, amount = this.totalPrice) {
  if (!this.canBeRefunded) {
    throw new Error("Ticket cannot be refunded");
  }
  
  this.refundHistory.push({
    amount,
    reason,
    status: "pending",
  });
  
  return this.refundHistory[this.refundHistory.length - 1];
};

// Static methods
TicketSchema.statics.findByEvent = function (eventId, options = {}) {
  const query = { eventId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate("userId", "name email")
    .sort({ issuedAt: -1 });
};

TicketSchema.statics.findByUser = function (userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate("eventId", "name startDate endDate venue")
    .sort({ issuedAt: -1 });
};

TicketSchema.statics.generateTicketNumber = function () {
  return generateTicketNumber();
};

// Helper function to generate unique ticket numbers
function generateTicketNumber() {
  const prefix = "TK";
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}${random}`.toUpperCase();
}

module.exports = mongoose.model("Ticket", TicketSchema);

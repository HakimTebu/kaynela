const mongoose = require("mongoose");
const { EVENT_TYPES, EVENT_STATUS, VENUE_TYPES, EVENT_DURATION_TYPES } = require("../constants");

const EventSchema = new mongoose.Schema(
  {
    // Basic event information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    
    eventType: {
      type: String,
      enum: Object.values(EVENT_TYPES),
      required: true,
      index: true,
    },
    
    category: {
      type: String,
      enum: ["agriculture", "tourism", "education", "entertainment", "food", "culture", "nature", "adventure", "wellness", "shopping"],
      required: true,
    },
    
    // Event timing
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    
    duration: {
      type: Number, // in minutes
      required: true,
      min: 15,
      max: 1440, // 24 hours
    },
    
    durationType: {
      type: String,
      enum: Object.values(EVENT_DURATION_TYPES),
      default: EVENT_DURATION_TYPES.SINGLE_DAY,
    },
    
    // Recurring event information
    isRecurring: {
      type: Boolean,
      default: false,
    },
    
    recurrencePattern: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
      },
      interval: Number, // every X days/weeks/months/years
      endDate: Date,
      daysOfWeek: [Number], // 0-6 for Sunday-Saturday
      dayOfMonth: Number, // 1-31
      monthOfYear: Number, // 1-12
    },
    
    // Venue information
    venue: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      type: {
        type: String,
        enum: Object.values(VENUE_TYPES),
        default: VENUE_TYPES.OUTDOOR,
      },
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      capacity: {
        type: Number,
        required: true,
        min: 1,
        max: 10000,
      },
      facilities: [String],
      accessibility: [String],
      parking: {
        available: Boolean,
        capacity: Number,
        cost: Number,
      },
    },
    
    // Ticket types and pricing
    ticketTypes: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
      },
      description: String,
      price: {
        type: Number,
        required: true,
        min: 0,
        max: 10000,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
        max: 10000,
      },
      sold: {
        type: Number,
        default: 0,
        min: 0,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      earlyBirdDiscount: {
        percentage: Number,
        validUntil: Date,
      },
      groupDiscount: {
        minQuantity: Number,
        percentage: Number,
      },
      specialOffers: [{
        name: String,
        description: String,
        discountPercentage: Number,
        validFrom: Date,
        validUntil: Date,
        conditions: String,
      }],
    }],
    
    // Event status and visibility
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.DRAFT,
      index: true,
    },
    
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    visibility: {
      type: String,
      enum: ["public", "private", "invite_only"],
      default: "public",
    },
    
    // Event details
    highlights: [String],
    includedItems: [String],
    excludedItems: [String],
    requirements: [String],
    restrictions: [String],
    
    // Media and content
    images: [{
      url: String,
      alt: String,
      caption: String,
      isPrimary: Boolean,
    }],
    
    videos: [{
      url: String,
      title: String,
      description: String,
      duration: Number,
    }],
    
    documents: [{
      name: String,
      url: String,
      type: String,
      size: Number,
    }],
    
    // Organizer information
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    organizerDetails: {
      name: String,
      email: String,
      phone: String,
      website: String,
      socialMedia: {
        facebook: String,
        twitter: String,
        instagram: String,
        linkedin: String,
      },
    },
    
    // Staff and volunteers
    staff: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      role: String,
      permissions: [String],
      assignedAt: Date,
    }],
    
    volunteers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      role: String,
      hours: Number,
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "completed"],
        default: "pending",
      },
    }],
    
    // Event schedule
    schedule: [{
      day: Number, // 0-6 for Sunday-Saturday
      timeSlots: [{
        startTime: String, // HH:MM format
        endTime: String, // HH:MM format
        activity: String,
        description: String,
        location: String,
        speaker: String,
        capacity: Number,
      }],
    }],
    
    // Special features
    features: {
      hasFood: Boolean,
      hasDrinks: Boolean,
      hasEntertainment: Boolean,
      hasWorkshops: Boolean,
      hasTours: Boolean,
      hasActivities: Boolean,
      isFamilyFriendly: Boolean,
      isPetFriendly: Boolean,
      hasWheelchairAccess: Boolean,
      hasParking: Boolean,
      hasShuttle: Boolean,
    },
    
    // Weather and outdoor considerations
    weatherDependent: Boolean,
    rainDate: Date,
    indoorBackup: Boolean,
    weatherPolicy: String,
    
    // Insurance and legal
    insurance: {
      hasInsurance: Boolean,
      provider: String,
      policyNumber: String,
      coverage: String,
    },
    
    permits: [{
      type: String,
      number: String,
      issuedBy: String,
      issuedDate: Date,
      expiryDate: Date,
      status: String,
    }],
    
    // Financial information
    budget: {
      estimated: Number,
      actual: Number,
      currency: {
        type: String,
        default: "USD",
      },
    },
    
    revenue: {
      projected: Number,
      actual: Number,
      currency: {
        type: String,
        default: "USD",
      },
    },
    
    // Marketing and promotion
    marketing: {
      targetAudience: [String],
      channels: [String],
      budget: Number,
      campaigns: [{
        name: String,
        description: String,
        budget: Number,
        startDate: Date,
        endDate: Date,
        status: String,
      }],
    },
    
    // Social media and hashtags
    hashtags: [String],
    socialMediaHandles: [String],
    
    // Analytics and tracking
    analytics: {
      views: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
      saves: {
        type: Number,
        default: 0,
      },
      conversionRate: Number,
      averageTicketPrice: Number,
      topPerformingTicketType: String,
    },
    
    // Reviews and ratings
    reviews: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
    }],
    
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    
    reviewCount: {
      type: Number,
      default: 0,
    },
    
    // Cancellation and refund policies
    cancellationPolicy: {
      allowCancellation: {
        type: Boolean,
        default: true,
      },
      cancellationDeadline: Date,
      refundPercentage: Number,
      processingFee: Number,
      terms: String,
    },
    
    refundPolicy: {
      allowRefunds: {
        type: Boolean,
        default: true,
      },
      refundDeadline: Date,
      refundPercentage: Number,
      processingFee: Number,
      terms: String,
    },
    
    // Transfer policies
    transferPolicy: {
      allowTransfers: {
        type: Boolean,
        default: true,
      },
      transferDeadline: Date,
      transferFee: Number,
      terms: String,
    },
    
    // Additional metadata
    tags: [String],
    keywords: [String],
    seoDescription: String,
    seoKeywords: String,
    
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
EventSchema.index({ organizerId: 1, status: 1 });
EventSchema.index({ eventType: 1, status: 1 });
EventSchema.index({ category: 1, status: 1 });
EventSchema.index({ startDate: 1, endDate: 1 });
EventSchema.index({ "venue.coordinates": "2dsphere" });
EventSchema.index({ tags: 1 });
EventSchema.index({ isPublished: 1, isActive: 1 });
EventSchema.index({ "ticketTypes.name": 1 });

// Virtual fields
EventSchema.virtual("isUpcoming").get(function () {
  return this.startDate > new Date();
});

EventSchema.virtual("isOngoing").get(function () {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now;
});

EventSchema.virtual("isPast").get(function () {
  return this.endDate < new Date();
});

EventSchema.virtual("totalCapacity").get(function () {
  return this.ticketTypes.reduce((total, type) => total + type.quantity, 0);
});

EventSchema.virtual("totalSold").get(function () {
  return this.ticketTypes.reduce((total, type) => total + type.sold, 0);
});

EventSchema.virtual("availableCapacity").get(function () {
  return this.totalCapacity - this.totalSold;
});

EventSchema.virtual("isSoldOut").get(function () {
  return this.availableCapacity <= 0;
});

EventSchema.virtual("occupancyRate").get(function () {
  if (this.totalCapacity === 0) return 0;
  return (this.totalSold / this.totalCapacity) * 100;
});

EventSchema.virtual("durationInHours").get(function () {
  return this.duration / 60;
});

EventSchema.virtual("daysUntilEvent").get(function () {
  const now = new Date();
  const timeDiff = this.startDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Pre-save middleware
EventSchema.pre("save", function (next) {
  // Calculate duration if not provided
  if (!this.duration && this.startDate && this.endDate) {
    this.duration = Math.round((this.endDate - this.startDate) / (1000 * 60));
  }
  
  // Set duration type based on duration
  if (this.duration) {
    if (this.duration <= 1440) { // 24 hours
      this.durationType = EVENT_DURATION_TYPES.SINGLE_DAY;
    } else if (this.duration <= 10080) { // 7 days
      this.durationType = EVENT_DURATION_TYPES.MULTI_DAY;
    } else {
      this.durationType = EVENT_DURATION_TYPES.ONGOING;
    }
  }
  
  // Update status based on dates
  const now = new Date();
  if (this.startDate && this.endDate) {
    if (this.endDate < now) {
      this.status = EVENT_STATUS.COMPLETED;
    } else if (this.startDate <= now && this.endDate >= now) {
      this.status = EVENT_STATUS.ONGOING;
    } else if (this.startDate > now) {
      this.status = EVENT_STATUS.UPCOMING;
    }
  }
  
  // Update sold out status
  if (this.availableCapacity <= 0) {
    this.status = EVENT_STATUS.SOLD_OUT;
  }
  
  // Increment version
  this.version += 1;
  
  next();
});

// Pre-validate middleware
EventSchema.pre("validate", function (next) {
  // Validate dates
  if (this.startDate && this.endDate) {
    if (this.startDate >= this.endDate) {
      this.invalidate("endDate", "End date must be after start date");
    }
    
    if (this.startDate < new Date()) {
      this.invalidate("startDate", "Start date cannot be in the past");
    }
  }
  
  // Validate ticket types
  if (this.ticketTypes && this.ticketTypes.length > 0) {
    const totalQuantity = this.ticketTypes.reduce((sum, type) => sum + type.quantity, 0);
    if (totalQuantity > this.venue.capacity) {
      this.invalidate("ticketTypes", "Total ticket quantity cannot exceed venue capacity");
    }
  }
  
  next();
});

// Instance methods
EventSchema.methods.addTicketType = function (ticketType) {
  this.ticketTypes.push(ticketType);
  return this.save();
};

EventSchema.methods.updateTicketType = function (ticketTypeId, updates) {
  const ticketType = this.ticketTypes.id(ticketTypeId);
  if (ticketType) {
    Object.assign(ticketType, updates);
    return this.save();
  }
  throw new Error("Ticket type not found");
};

EventSchema.methods.removeTicketType = function (ticketTypeId) {
  this.ticketTypes = this.ticketTypes.filter(type => type._id.toString() !== ticketTypeId.toString());
  return this.save();
};

EventSchema.methods.sellTickets = function (ticketTypeName, quantity) {
  const ticketType = this.ticketTypes.find(type => type.name === ticketTypeName);
  if (!ticketType) {
    throw new Error("Ticket type not found");
  }
  
  if (ticketType.sold + quantity > ticketType.quantity) {
    throw new Error("Insufficient tickets available");
  }
  
  ticketType.sold += quantity;
  return this.save();
};

EventSchema.methods.refundTickets = function (ticketTypeName, quantity) {
  const ticketType = this.ticketTypes.find(type => type.name === ticketTypeName);
  if (!ticketType) {
    throw new Error("Ticket type not found");
  }
  
  if (ticketType.sold < quantity) {
    throw new Error("Cannot refund more tickets than sold");
  }
  
  ticketType.sold -= quantity;
  return this.save();
};

EventSchema.methods.publish = function () {
  this.isPublished = true;
  this.status = EVENT_STATUS.PUBLISHED;
  return this.save();
};

EventSchema.methods.unpublish = function () {
  this.isPublished = false;
  this.status = EVENT_STATUS.DRAFT;
  return this.save();
};

EventSchema.methods.activate = function () {
  this.isActive = true;
  this.status = EVENT_STATUS.ACTIVE;
  return this.save();
};

EventSchema.methods.deactivate = function () {
  this.isActive = false;
  this.status = EVENT_STATUS.INACTIVE;
  return this.save();
};

EventSchema.methods.cancel = function (reason) {
  this.status = EVENT_STATUS.CANCELLED;
  this.cancellationReason = reason;
  return this.save();
};

// Static methods
EventSchema.statics.findUpcoming = function (limit = 10) {
  return this.find({
    startDate: { $gt: new Date() },
    isPublished: true,
    isActive: true,
    status: { $in: [EVENT_STATUS.UPCOMING, EVENT_STATUS.ACTIVE] },
  })
    .sort({ startDate: 1 })
    .limit(limit);
};

EventSchema.statics.findByOrganizer = function (organizerId, options = {}) {
  const query = { organizerId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.isPublished !== undefined) {
    query.isPublished = options.isPublished;
  }
  
  return this.find(query).sort({ startDate: -1 });
};

EventSchema.statics.findByType = function (eventType, options = {}) {
  const query = { eventType, isPublished: true, isActive: true };
  
  if (options.startDate) {
    query.startDate = { $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.endDate = { $lte: options.endDate };
  }
  
  return this.find(query).sort({ startDate: 1 });
};

EventSchema.statics.search = function (searchTerm, options = {}) {
  const query = {
    $and: [
      { isPublished: true, isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
          { tags: { $in: [new RegExp(searchTerm, "i")] } },
          { category: { $regex: searchTerm, $options: "i" } },
        ],
      },
    ],
  };
  
  if (options.eventType) {
    query.eventType = options.eventType;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.startDate) {
    query.startDate = { $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.endDate = { $lte: options.endDate };
  }
  
  if (options.location) {
    query["venue.city"] = { $regex: options.location, $options: "i" };
  }
  
  return this.find(query).sort({ startDate: 1 });
};

module.exports = mongoose.model("Event", EventSchema);

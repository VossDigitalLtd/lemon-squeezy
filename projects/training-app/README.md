# Online Training Platform

A flexible, multi-tenant online training platform for course creators to build and sell courses to students.

## Overview

This project extends the Voss Digital Admin Boilerplate to create a complete online course platform.

## Tech Stack

- **Foundation**: Voss Digital Admin Boilerplate
- **Framework**: Next.js 16, React 19, TailwindCSS 4
- **Authentication**: Supabase Auth (with magic link for students)
- **Database**: Supabase with RLS
- **Storage**: Supabase Storage (for course media/assets)
- **Payments**: Stripe

## Core Features

### For Course Creators (Admin Area)
- Course management (CRUD operations)
- Lesson builder with multiple content types (video, text, PDF, quiz)
- Media library for assets
- Student management and analytics
- Course templates for different industries

### For Students (Public Area)
- Browse course catalog
- Purchase courses via Stripe
- Learning interface with progress tracking
- Quiz/assessment system
- Certificate generation on completion

## Project Structure

```
src/
├── app/
│   ├── admin/                # Course creator admin area (from boilerplate)
│   │   ├── courses/          # Course management
│   │   ├── students/         # Student management
│   │   ├── analytics/        # Analytics dashboards
│   │   └── media/            # Media library
│   ├── (public)/             # Public-facing pages
│   │   ├── catalog/          # Course catalog
│   │   ├── checkout/         # Purchase flow
│   │   └── learn/            # Learning interface
│   └── api/
│       ├── courses/          # Course CRUD
│       ├── enrollments/      # Enrollment management
│       ├── progress/         # Progress tracking
│       └── webhooks/         # Stripe webhooks
├── components/
│   ├── course/               # Course-specific components
│   │   ├── CourseCard.js
│   │   ├── LessonEditor.js
│   │   └── CourseBuilder.js
│   └── learning/             # Learning interface components
│       ├── VideoPlayer.js
│       ├── ProgressTracker.js
│       └── QuizRenderer.js
└── lib/
    └── services/
        ├── CourseService.js
        ├── EnrollmentService.js
        └── ProgressService.js
```

## Database Schema

### Core Tables

```sql
-- Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'draft', -- draft, published, archived
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL, -- video, text, pdf, quiz
  content JSONB DEFAULT '{}',
  position INTEGER NOT NULL,
  duration_minutes INTEGER,
  is_free_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments table
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- active, completed, refunded
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  stripe_payment_id TEXT,
  UNIQUE(user_id, course_id)
);

-- Progress tracking
CREATE TABLE lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);
```

### RLS Policies

```sql
-- Courses: Owners can manage, anyone can view published
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_owner_all" ON courses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "published_courses_viewable" ON courses
  FOR SELECT USING (status = 'published');

-- Enrollments: Users can view their own
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_enrollments" ON enrollments
  FOR SELECT USING (auth.uid() = user_id);

-- Progress: Users can manage their own
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_progress" ON lesson_completions
  FOR ALL USING (auth.uid() = user_id);
```

## Development Phases

### Phase 1: Foundation
- [x] Project initialization
- [x] Copy reusable components from SafeDox
- [x] Authentication setup (Supabase Auth)
- [x] Base database patterns
- [ ] Course database schema
- [ ] Course service implementation

### Phase 2: Course Creator Area
- [ ] Course CRUD operations
- [ ] Lesson builder
- [ ] Media library
- [ ] Course templates
- [ ] Preview mode

### Phase 3: Student Experience
- [ ] Course catalog with search/filter
- [ ] Checkout flow with Stripe
- [ ] Learning interface
- [ ] Progress tracking
- [ ] Certificate generation

### Phase 4: Advanced Features
- [ ] Analytics dashboards
- [ ] Email notifications (welcome, progress, completion)
- [ ] Quiz/assessment system with grading
- [ ] Discussion forums per lesson
- [ ] Affiliate/referral system

## Stripe Integration

### Checkout Flow

```javascript
// Create checkout session
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{
    price_data: {
      currency: course.currency,
      product_data: {
        name: course.title,
        description: course.description,
        images: [course.thumbnail_url],
      },
      unit_amount: course.price_cents,
    },
    quantity: 1,
  }],
  success_url: `${APP_URL}/learn/${course.slug}?enrolled=true`,
  cancel_url: `${APP_URL}/catalog/${course.slug}`,
  metadata: {
    user_id: user.id,
    course_id: course.id,
  },
});
```

### Webhook Handler

```javascript
// Handle successful payment
case 'checkout.session.completed': {
  const { user_id, course_id } = session.metadata;

  await EnrollmentService.create(supabase, {
    user_id,
    course_id,
    stripe_payment_id: session.payment_intent,
  });

  // Send welcome email
  await sendCourseWelcomeEmail(user_id, course_id);
  break;
}
```

## Media Storage

Course assets are stored in Supabase Storage:

```
user-assets/
├── {user_id}/
│   ├── avatars/
│   └── courses/
│       └── {course_id}/
│           ├── thumbnail.jpg
│           ├── videos/
│           ├── pdfs/
│           └── images/
```

## Getting Started

1. Set up the base boilerplate following main README
2. Run course database migrations
3. Configure Stripe webhook
4. Implement course-specific components

## License

Private - Not for distribution

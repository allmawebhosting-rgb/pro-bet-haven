# Remix of Remix of Remix of Remix of Golden Goals Premium

Build a world-class, premium, mobile-first sports predictions subscription platform with a luxury black, gold, and white theme. The website should look like a high-end fintech platform with glassmorphism, smooth animations, premium typography, subtle gradients, modern football visuals, responsive layouts, and fast performance.

The website name should be easy to change from the admin panel.

## Landing Page

Create a premium landing page featuring:

- Full-screen hero section with football stadium background

- Large headline: "Premium Sports Predictions"

- Subtitle explaining that users receive carefully researched football predictions.

- Animated statistics cards

- Premium call-to-action button

- Modern navigation bar

- Smooth scrolling animations

- Testimonials section

- FAQ section

- Footer with contact information and social media links

Everything should have a luxury, professional appearance.

## User Registration

Users must register before accessing any predictions.

Registration requires ONLY:

- Full Name (Required)

- WhatsApp Number (Required)

Do not ask users to choose a channel.

After registration:

- Automatically assign each user randomly to either Channel A or Channel B using a 50/50 distribution.

- Save the assigned channel in the database.

- Redirect users directly to their assigned channel.

- Users should never know the other channel exists.

- On future visits, users always return to their assigned channel.

- Users cannot switch channels.

## User Dashboard

After login, users see a premium dashboard containing:

- Welcome message

- Countdown timer until the next prediction release

- Featured match card

- Prediction history

- Performance statistics

- Premium animated cards

- Football-themed icons

- Responsive sidebar

- Dark mode

## Prediction Page

Each assigned channel has its own prediction page.

Display:

- Large animated countdown timer

- Match name

- League

- Match date

- Kickoff time

- Home team

- Away team

- Prediction

- Odds

- Confidence indicator

- Premium loading animations

Predictions should only appear when the admin publishes them or according to the configured release schedule.

Do not present predictions as guaranteed outcomes.

## Channel System

Create two completely separate channels:

Channel A

Channel B

Each channel must have:

- Independent countdown timer

- Independent prediction list

- Independent schedule

- Independent members

- Separate content management

Users can only view the channel they were randomly assigned.

## Admin Panel

Create a secure admin dashboard.

Admin can:

- Login securely

- Add predictions

- Edit predictions

- Delete predictions

- Schedule prediction releases

- Configure countdown timers

- Publish or hide predictions

- Manage Channel A

- Manage Channel B

- View all registered users

- Search users by name

- Search users by WhatsApp number

- View assigned channel

- Reassign users between channels if needed

- Enable or disable user accounts

- View registration analytics

- Send announcements to all users

- Send announcements to Channel A only

- Send announcements to Channel B only

- Change website name, logo, colors, and branding from the admin panel

## Database

Store:

- User ID

- Full Name

- WhatsApp Number

- Assigned Channel

- Registration Date

- Last Login

- Membership Status

## Notifications

Create an announcement system that notifies users when:

- A new prediction is published

- A countdown reaches zero

- The admin posts an announcement

## Design

Use:

- Black background

- Gold accents

- White text

- Glassmorphism cards

- Rounded corners

- Soft shadows

- Luxury typography

- Animated gradients

- Premium icons

- Framer Motion animations

- Smooth page transitions

- Responsive design

- Mobile-first layout

- SEO optimization

- Fast loading

- Skeleton loaders

- Beautiful football illustrations

- Modern charts and statistics

## Technology Stack

Use:

- Next.js

- React

- TypeScript

- Tailwind CSS

- Framer Motion

- Supabase Authentication

- Supabase Database

- Clean architecture

- Reusable components

- Secure authentication

- Optimized performance

The finished website should feel like a premium subscription platform with a polished, modern user experience, excellent performance, and a professional interface across desktop, tablet, and mobile devices.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5efded34-3430-410b-9e3c-de3690f23c1d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

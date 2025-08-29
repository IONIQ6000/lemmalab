# LemmaLab

A modern proof editor and course platform built with Next.js, featuring a monochrome design and comprehensive proof checking capabilities.

## Features

- **Proof Editor**: Interactive proof creation and editing with real-time validation
- **Course Management**: Create and manage courses with assignments
- **User Authentication**: Secure sign-in/sign-up with NextAuth.js
- **Database Integration**: PostgreSQL with Prisma ORM
- **Modern UI**: Built with Radix UI components and Tailwind CSS
- **Monochrome Theme**: Clean, distraction-free interface

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lemmalab
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database and authentication configuration.

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Create an admin user:
```bash
npm run create-admin
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run create-admin` - Create admin user

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

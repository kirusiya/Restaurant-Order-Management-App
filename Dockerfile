# Stage 1: Build the Next.js application
# Use a Node.js image with a specific version for consistency
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to leverage Docker cache
# This step is crucial for faster builds if dependencies don't change
COPY package.json yarn.lock* pnpm-lock.yaml* ./
# Use pnpm if pnpm-lock.yaml exists, otherwise yarn or npm
RUN \
  if [ -f "pnpm-lock.yaml" ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
  elif [ -f "yarn.lock" ]; then yarn install --frozen-lockfile; \
  else npm install --legacy-peer-deps; \
  fi

# Copy the rest of the application source code
COPY . .

# Build the Next.js application for production
# This command will generate the optimized build output in the .next directory
RUN npm run build

# Stage 2: Production-ready image
# Use a lightweight Node.js image for the final production environment
FROM node:20-alpine AS runner

# Set the working directory
WORKDIR /app

# Set environment variables for Next.js production mode
ENV NODE_ENV production

# Copy necessary files from the builder stage
# Copy the built Next.js application
COPY --from=builder /app/.next ./.next
# Copy public assets
COPY --from=builder /app/public ./public
# Copy package.json (only for running the app, not for installing dev dependencies)
COPY --from=builder /app/package.json ./package.json
# Copy node_modules (only production dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Expose the port on which the Next.js application will run
EXPOSE 3000

# Command to run the Next.js application in production mode
# 'npm start' typically runs 'next start' as defined in package.json
CMD ["npm", "start"]

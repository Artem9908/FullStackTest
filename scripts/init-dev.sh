#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    
    # Generate random passwords
    DB_PASSWORD=$(openssl rand -base64 32)
    PGADMIN_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 64)
    
    # Replace default passwords with random ones
    sed -i '' "s/your_secure_password/$DB_PASSWORD/" .env
    sed -i '' "s/your_secure_password/$PGADMIN_PASSWORD/" .env
    sed -i '' "s/your_jwt_secret_key/$JWT_SECRET/" .env
fi

# Create necessary directories
mkdir -p nginx/conf.d nginx/ssl nginx/logs

# Generate SSL certificates if they don't exist
if [ ! -f nginx/ssl/server.crt ]; then
    echo "Generating SSL certificates..."
    ./scripts/generate-ssl.sh
fi

# Create Docker network if it doesn't exist
if ! docker network inspect app-network >/dev/null 2>&1; then
    echo "Creating Docker network..."
    docker network create app-network
fi

# Build and start containers
echo "Building and starting containers..."
docker-compose up --build -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker-compose exec app ./main migrate

echo "Development environment initialized successfully!"
echo "Access the application at https://localhost"
echo "Access pgAdmin at http://localhost:5050" 
# Full Stack Test Project

This is a full-stack application with a Go backend using Gin and GORM, and PostgreSQL as the database.

## Features

- RESTful API with CRUD operations for users
- PostgreSQL database with GORM ORM
- Docker and Docker Compose setup
- GitHub Actions CI/CD pipeline
- API testing

## Prerequisites

- Go 1.21 or later
- Docker and Docker Compose
- PostgreSQL (if running locally)

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd fullstacktest
   ```

2. Set up environment variables:
   Copy the `.env.example` file to `.env` and update the values as needed.

3. Run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

   Or run locally:
   ```bash
   go mod download
   go run cmd/api/main.go
   ```

## API Endpoints

- GET /api/users - Get all users
- POST /api/users - Create a new user
- PUT /api/users/:id - Update a user
- DELETE /api/users/:id - Delete a user

## Testing

Run the tests:
```bash
go test ./...
```

## Project Structure

```
.
├── cmd/
│   └── api/
│       └── main.go
├── pkg/
│   ├── database/
│   │   └── database.go
│   ├── handlers/
│   │   ├── user_handler.go
│   │   └── user_handler_test.go
│   └── models/
│       └── user.go
├── .env
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.

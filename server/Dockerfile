# # Start from the official Go image
# FROM golang:1.22.6-alpine
# # Set the Current Working Directory inside the container
# WORKDIR /
# # Copy go.mod and go.sum files
# COPY go.mod go.sum ./
# # Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
# RUN go mod download
# # Copy the source from the current directory to the Working Directory inside the container
# COPY . .

# RUN go build -o /main /main.go

# EXPOSE 8080

# # CMD ["go", "run", "."]

# CMD ["/main"]

# FROM golang:1.22.6-alpine AS builder

# WORKDIR /
# COPY go.mod go.sum ./
# RUN go mod download && go mod verify
# COPY . .
# RUN go build -o main ./main.go



# FROM alpine:latest
# WORKDIR /
# COPY --from=builder /main .
# EXPOSE 8080

# CMD ["./main"]
# FROM golang:1.23.2-alpine
# WORKDIR /app
# COPY go.mod go.sum ./
# RUN go mod download

# RUN go get github.com/air-verse/air

# COPY . .

# EXPOSE 8080

# CMD ["air"]

# # CMD ["go", "run", "."]

# # CMD ["/main"]

# Stage 1: Build
FROM golang:1.23.2-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy go.mod and go.sum files for dependency management
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of your source code
COPY . .

# Install air for hot reloading
RUN go install github.com/air-verse/air@latest

# Command to run air
CMD ["air"]

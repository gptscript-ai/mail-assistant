FROM golang:1.22 as builder

WORKDIR /

COPY . .

RUN curl https://get.gptscript.ai/install.sh | sh

RUN CGO_ENABLED=0 go build -o copilot-server ./pkg/server/server.go

RUN CGO_ENABLED=0 go build -o gem-copilot ./main.go

FROM alpine:latest

WORKDIR /app

# Copy the binaries from the builder stage
COPY --from=builder /copilot-server /usr/bin/copilot-server
COPY --from=builder /gem-copilot /usr/bin/gem-copilot
COPY --from=builder /usr/local/bin/gptscript /usr/bin/gptscript

# Make the binaries executable
RUN chmod +x /usr/bin/gem-copilot /usr/bin/copilot-server

# Set the entrypoint to run binary1
ENTRYPOINT ["copilot-server"]

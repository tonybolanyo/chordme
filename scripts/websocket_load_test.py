#!/usr/bin/env python3
"""
WebSocket load testing script for ChordMe real-time infrastructure.
Tests connection handling, authentication, and room operations.
"""

import asyncio
import json
import time
import logging
from typing import List, Dict, Any
import socketio
import jwt
from datetime import datetime, timedelta

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebSocketLoadTester:
    """Load tester for WebSocket server."""
    
    def __init__(self, server_url: str = 'http://localhost:5000', jwt_secret: str = 'your-secret-key'):
        self.server_url = server_url
        self.jwt_secret = jwt_secret
        self.clients: List[socketio.AsyncClient] = []
        self.connected_clients = 0
        self.authenticated_clients = 0
        self.total_messages_sent = 0
        self.total_messages_received = 0
        self.errors = []
        self.start_time = None
        
    def generate_test_token(self, user_id: int) -> str:
        """Generate a test JWT token."""
        payload = {
            'user_id': user_id,
            'email': f'test{user_id}@example.com',
            'exp': datetime.utcnow() + timedelta(hours=1),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')
    
    async def create_client(self, client_id: int) -> socketio.AsyncClient:
        """Create and configure a WebSocket client."""
        client = socketio.AsyncClient(logger=False, engineio_logger=False)
        
        # Event handlers
        @client.event
        async def connect():
            self.connected_clients += 1
            logger.debug(f"Client {client_id} connected")
            
            # Authenticate immediately
            token = self.generate_test_token(client_id)
            await client.emit('authenticate', {'token': token})
        
        @client.event
        async def disconnect():
            self.connected_clients -= 1
            logger.debug(f"Client {client_id} disconnected")
        
        @client.event
        async def authenticated(data):
            self.authenticated_clients += 1
            logger.debug(f"Client {client_id} authenticated")
            
            # Join a test room
            room_id = f"test_room_{client_id % 10}"  # 10 rooms total
            await client.emit('join_room', {'room_id': room_id})
        
        @client.event
        async def auth_error(data):
            self.errors.append(f"Client {client_id} auth error: {data['message']}")
            logger.error(f"Client {client_id} auth error: {data['message']}")
        
        @client.event
        async def room_joined(data):
            logger.debug(f"Client {client_id} joined room {data['room_id']}")
        
        @client.event
        async def collaboration_update(data):
            self.total_messages_received += 1
            logger.debug(f"Client {client_id} received collaboration update")
        
        @client.event
        async def room_message(data):
            self.total_messages_received += 1
            logger.debug(f"Client {client_id} received room message")
        
        @client.event
        async def error(data):
            self.errors.append(f"Client {client_id} error: {data['message']}")
            logger.error(f"Client {client_id} error: {data['message']}")
        
        return client
    
    async def connect_clients(self, num_clients: int, batch_size: int = 10, delay: float = 0.1):
        """Connect multiple clients in batches."""
        logger.info(f"Connecting {num_clients} clients in batches of {batch_size}")
        
        for i in range(0, num_clients, batch_size):
            batch_end = min(i + batch_size, num_clients)
            batch_tasks = []
            
            for j in range(i, batch_end):
                client = await self.create_client(j)
                self.clients.append(client)
                task = asyncio.create_task(client.connect(self.server_url))
                batch_tasks.append(task)
            
            # Wait for batch to connect
            await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Small delay between batches
            if delay > 0:
                await asyncio.sleep(delay)
            
            logger.info(f"Connected {batch_end}/{num_clients} clients")
    
    async def send_test_messages(self, messages_per_client: int = 5, delay: float = 1.0):
        """Send test messages from all authenticated clients."""
        logger.info(f"Sending {messages_per_client} messages per client")
        
        for round_num in range(messages_per_client):
            tasks = []
            
            for i, client in enumerate(self.clients):
                if client.connected:
                    # Send collaboration operation
                    operation = {
                        'type': 'insert',
                        'position': round_num * 10,
                        'content': f'Test message {round_num} from client {i}',
                    }
                    
                    room_id = f"test_room_{i % 10}"
                    task = asyncio.create_task(
                        client.emit('collaboration_operation', {
                            'room_id': room_id,
                            'operation': operation
                        })
                    )
                    tasks.append(task)
                    self.total_messages_sent += 1
            
            # Wait for all messages to be sent
            await asyncio.gather(*tasks, return_exceptions=True)
            
            logger.info(f"Sent round {round_num + 1}/{messages_per_client} messages")
            
            if delay > 0:
                await asyncio.sleep(delay)
    
    async def test_ping_latency(self, ping_count: int = 10):
        """Test ping/pong latency with a subset of clients."""
        if not self.clients:
            logger.warning("No clients available for latency testing")
            return
        
        logger.info(f"Testing latency with {min(10, len(self.clients))} clients")
        latencies = []
        
        for i in range(min(10, len(self.clients))):
            client = self.clients[i]
            if not client.connected:
                continue
                
            ping_latencies = []
            
            for _ in range(ping_count):
                start_time = time.time()
                
                # Set up pong handler
                pong_received = asyncio.Event()
                
                @client.event
                async def pong(data):
                    pong_received.set()
                
                # Send ping
                await client.emit('ping')
                
                # Wait for pong (with timeout)
                try:
                    await asyncio.wait_for(pong_received.wait(), timeout=5.0)
                    latency = (time.time() - start_time) * 1000  # ms
                    ping_latencies.append(latency)
                except asyncio.TimeoutError:
                    logger.warning(f"Ping timeout for client {i}")
                    ping_latencies.append(5000)  # 5s timeout
                
                await asyncio.sleep(0.1)
            
            if ping_latencies:
                avg_latency = sum(ping_latencies) / len(ping_latencies)
                latencies.append(avg_latency)
                logger.debug(f"Client {i} average latency: {avg_latency:.2f}ms")
        
        if latencies:
            overall_avg = sum(latencies) / len(latencies)
            logger.info(f"Overall average latency: {overall_avg:.2f}ms")
            return overall_avg
        
        return None
    
    async def disconnect_clients(self):
        """Disconnect all clients."""
        logger.info(f"Disconnecting {len(self.clients)} clients")
        
        tasks = []
        for client in self.clients:
            if client.connected:
                task = asyncio.create_task(client.disconnect())
                tasks.append(task)
        
        await asyncio.gather(*tasks, return_exceptions=True)
        self.clients.clear()
    
    def print_results(self):
        """Print test results."""
        duration = time.time() - self.start_time if self.start_time else 0
        
        print("\n" + "="*60)
        print("WEBSOCKET LOAD TEST RESULTS")
        print("="*60)
        print(f"Test Duration: {duration:.2f} seconds")
        print(f"Peak Connected Clients: {self.connected_clients}")
        print(f"Peak Authenticated Clients: {self.authenticated_clients}")
        print(f"Total Messages Sent: {self.total_messages_sent}")
        print(f"Total Messages Received: {self.total_messages_received}")
        
        if duration > 0:
            msg_rate = self.total_messages_sent / duration
            print(f"Message Rate: {msg_rate:.2f} messages/second")
        
        print(f"Total Errors: {len(self.errors)}")
        
        if self.errors:
            print("\nErrors:")
            for error in self.errors[:10]:  # Show first 10 errors
                print(f"  - {error}")
            if len(self.errors) > 10:
                print(f"  ... and {len(self.errors) - 10} more errors")
        
        print("="*60)
    
    async def run_load_test(self, 
                           num_clients: int = 50,
                           messages_per_client: int = 5,
                           test_duration: int = 60):
        """Run the complete load test."""
        logger.info("Starting WebSocket load test")
        self.start_time = time.time()
        
        try:
            # Phase 1: Connect clients
            await self.connect_clients(num_clients)
            await asyncio.sleep(2)  # Let connections stabilize
            
            logger.info(f"Connected: {self.connected_clients}, Authenticated: {self.authenticated_clients}")
            
            # Phase 2: Test messaging
            await self.send_test_messages(messages_per_client)
            await asyncio.sleep(2)  # Let messages process
            
            # Phase 3: Test latency
            await self.test_ping_latency()
            
            # Phase 4: Sustained load
            logger.info(f"Running sustained load for {test_duration} seconds")
            end_time = time.time() + test_duration
            
            while time.time() < end_time:
                # Send periodic messages
                await self.send_test_messages(1, delay=0.5)
                await asyncio.sleep(1)
            
        except KeyboardInterrupt:
            logger.info("Test interrupted by user")
        except Exception as e:
            logger.error(f"Test failed with error: {e}")
            self.errors.append(f"Test failure: {e}")
        
        finally:
            # Cleanup
            await self.disconnect_clients()
            self.print_results()


async def main():
    """Main test runner."""
    import argparse
    
    parser = argparse.ArgumentParser(description='WebSocket Load Tester for ChordMe')
    parser.add_argument('--url', default='http://localhost:5000', 
                       help='WebSocket server URL')
    parser.add_argument('--clients', type=int, default=50,
                       help='Number of concurrent clients')
    parser.add_argument('--messages', type=int, default=5,
                       help='Messages per client per round')
    parser.add_argument('--duration', type=int, default=60,
                       help='Test duration in seconds')
    parser.add_argument('--jwt-secret', default='your-secret-key',
                       help='JWT secret for token generation')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    tester = WebSocketLoadTester(args.url, args.jwt_secret)
    
    print(f"Starting load test with {args.clients} clients")
    print(f"Target server: {args.url}")
    print(f"Test duration: {args.duration} seconds")
    print("Press Ctrl+C to stop early\n")
    
    await tester.run_load_test(
        num_clients=args.clients,
        messages_per_client=args.messages,
        test_duration=args.duration
    )


if __name__ == '__main__':
    asyncio.run(main())
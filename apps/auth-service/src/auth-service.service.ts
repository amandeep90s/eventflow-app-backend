import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class AuthServiceService implements OnModuleInit {
  constructor(
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Connect to Kafka when the module is initialized
    await this.kafkaClient.connect();
  }

  getHello(): string {
    return 'Hello from AuthService!';
  }

  simulateUserRegistration(email: string) {
    // Publihs event to Kafka topic 'user-registered'
    this.kafkaClient.emit(KAFKA_TOPICS.USER_REGISTERED, {
      email,
      timestamp: new Date().toISOString(),
    });

    return { message: `User registered: ${email}` };
  }
}

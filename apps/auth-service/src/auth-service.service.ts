import { DatabaseService, users } from '@app/database';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import {
  ConflictException,
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientKafka } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

@Injectable()
export class AuthServiceService implements OnModuleInit {
  constructor(
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
    private readonly dbService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // Connect to Kafka when the module is initialized
    try {
      await this.kafkaClient.connect();
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      // Continue even if Kafka fails - it's optional for register
    }
  }

  async register(email: string, password: string, name: string) {
    // Check if user already exists
    const existingUser = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictException('User already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const [user] = await this.dbService.db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
      })
      .returning();

    // Emit user registered event to Kafka
    try {
      this.kafkaClient.emit(KAFKA_TOPICS.USER_REGISTERED, {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to emit USER_REGISTERED event to Kafka:', error);
      // Continue - Kafka failure shouldn't block registration
    }

    return {
      message: 'User registered successfully',
      user,
    };
  }

  async login(email: string, password: string) {
    const [user] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    try {
      this.kafkaClient.emit(KAFKA_TOPICS.USER_LOGIN, {
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to emit USER_LOGIN event to Kafka:', error);
      // Continue - Kafka failure shouldn't block login
    }

    return {
      message: 'Login successful',
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const [user] = await this.dbService.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}

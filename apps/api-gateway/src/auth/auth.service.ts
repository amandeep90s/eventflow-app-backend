import { SERVICES_PORTS } from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private readonly authServiceUrl = `http://localhost:${SERVICES_PORTS.AUTH_SERVICE}`;

  constructor(private readonly httpService: HttpService) {}

  async register(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<Record<string, any>>(
          `${this.authServiceUrl}/register`,
          data,
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async login(data: { email: string; password: string }): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<Record<string, any>>(
          `${this.authServiceUrl}/login`,
          data,
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getProfile(token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<Record<string, any>>(
          `${this.authServiceUrl}/profile`,
          {
            headers: { Authorization: token },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof AxiosError) {
      const responseData = error.response?.data as Record<string, unknown>;
      const message =
        typeof responseData?.message === 'string'
          ? responseData.message
          : 'Internal Server Error';
      const status = error.response?.status ?? 500;
      throw new HttpException(message, status);
    }

    throw new HttpException('Internal Server Error', 500);
  }
}

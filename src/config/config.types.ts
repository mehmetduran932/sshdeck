export type KeyAuthConfig = {
  type: "key";
  keyPath: string;
};

export type PasswordAuthConfig = {
  type: "password";
  secretRef: string;
};

export type AgentAuthConfig = {
  type: "agent";
};

export type AuthConfig = KeyAuthConfig | PasswordAuthConfig | AgentAuthConfig;

export interface ServerConfig {
  tag: string;
  name: string;
  host: string;
  port: number;
  username: string;
  group?: string;
  description?: string;
  auth: AuthConfig;
}

export interface AppConfig {
  version: number;
  servers: ServerConfig[];
}

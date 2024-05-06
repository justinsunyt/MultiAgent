export interface Chat {
  id: string;
  owner: string;
  model: string;
  messages: [{ type: string; role: string; content: string }];
  last_chatted: string;
  session_id: string;
}

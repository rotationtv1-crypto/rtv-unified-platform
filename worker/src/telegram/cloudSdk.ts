export class CloudSDKClient {
  private botToken: string

  constructor(botToken: string) {
    this.botToken = botToken
  }

  async getUser(userId: number): Promise<unknown> {
    return this.call('getChatMember', { chat_id: userId, user_id: userId })
  }

  async getChat(chatId: number | string): Promise<unknown> {
    return this.call('getChat', { chat_id: chatId })
  }

  async sendMessage(chatId: number | string, text: string, options?: Record<string, unknown>): Promise<unknown> {
    return this.call('sendMessage', { chat_id: chatId, text, ...options })
  }

  async editMessage(chatId: number | string, messageId: number, text: string, options?: Record<string, unknown>): Promise<unknown> {
    return this.call('editMessageText', { chat_id: chatId, message_id: messageId, text, ...options })
  }

  async deleteMessage(chatId: number | string, messageId: number): Promise<unknown> {
    return this.call('deleteMessage', { chat_id: chatId, message_id: messageId })
  }

  async invokeMethod(method: string, params: Record<string, unknown>): Promise<unknown> {
    return this.call(method, params)
  }

  async uploadFile(chatId: number | string, file: File | Blob, filename: string): Promise<unknown> {
    const formData = new FormData()
    formData.append('chat_id', String(chatId))
    formData.append('document', file, filename)
    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendDocument`, {
      method: 'POST',
      body: formData
    })
    return res.json()
  }

  async downloadFile(fileId: string): Promise<{ url: string }> {
    const fileInfo = await this.call('getFile', { file_id: fileId })
    const result = (fileInfo as { result?: { file_path: string } }).result
    if (!result?.file_path) throw new Error('File not found')
    const url = `https://api.telegram.org/file/bot${this.botToken}/${result.file_path}`
    return { url }
  }

  private async call(method: string, params: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    return res.json()
  }
}

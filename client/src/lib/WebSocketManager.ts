class WebSocketManager {
  private ws: WebSocket | null;

  constructor() {
    this.ws = null;
  }

  public connect(url: string): void {
    if (this.ws) {
      return this.close();
    }

    this.ws = new WebSocket(url);
    this.ws.onopen = () => console.log("websocket connected");
    this.ws.onclose = () => console.log("websocket disconnected");
    this.ws.onerror = (error) => console.error("websocket error: ", error);
    this.ws.onmessage = (e) => this.handleMessage(JSON.parse(e.data));
  }

  public close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  public handleMessage(data: any) {
    console.log("recv: ", data);
  }
}

export default new WebSocketManager();

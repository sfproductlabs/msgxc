
export default class WebSocketClient {

    constructor(url) {
        this.number = 0;	// Message number
        this.autoReconnectInterval = 1*1000;	// ms
        this.url = url;
        this.open(url);
    }

    open (url){
        console.log("WebSocketClient: Connecting...");
        const isSSR = typeof window === 'undefined';
        if (!isSSR) {
            if (url) this.url = url;
            this.instance = new window.WebSocket(url);
            //console.log(this.instance);
            this.instance.onopen = ()=>{
                this.onopen();
            };
            this.instance.onmessage = (data,flags)=>{
                this.number ++;
                this.onmessage(data,flags,this.number);
            };
            this.instance.onclose = (e)=>{
                switch (e.code){
                case 1000:	// CLOSE_NORMAL
                    //console.log("WebSocket: closed");
                    break;
                default:	// Abnormal closure
                    this.reconnect(e);
                    break;
                }
                this.onclose(e);
            };
            this.instance.onerror = (e)=>{
                switch (e.code){
                case 'ECONNREFUSED':
                    this.reconnect(e);
                    break;
                default:
                    this.onerror(e);
                    break;
                }
            };
        }
    }
    send (data,option){
        try{
            if (this && this.instance && this.instance.send)
                this.instance.send(data,option);
        } catch (e){
            throw e;
        }
    }
    close () {
        try{
            this.instance.close();
        }catch (e){
            console.error(e);
        }
    }
    reconnect (e){
        //console.log(`WebSocketClient: retry in ${this.autoReconnectInterval}ms`,e);
        //this.instance.removeAllListeners();
        var that = this;
        setTimeout(function(){
            that.open(that.url);
        },this.autoReconnectInterval);
    }
    onopen (e){	console.log("WebSocketClient: open",arguments);	}
    onmessage (data,flags,number){	console.log("WebSocketClient: message",arguments);	}
    onerror (e){	console.log("WebSocketClient: error",arguments);	}
    onclose (e){	console.log("WebSocketClient: closed",arguments);	}
}


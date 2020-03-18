import React, { useContext, useEffect, Component } from 'react'
import WebSocketClient from './WebSocketClient';

const socket = new WebSocketClient(process.env.REACT_APP_URL_WS);
socket.onopen = () => {
    socket.send(JSON.stringify({slug: '/ping'}))
    socket.send(JSON.stringify({
        slug: `/api/v1/subscribe/thread`,
        tid: '5ae3c890-5e55-11ea-9283-4fa18a847130',
        jwt: process.env.REACT_APP_EXAMPLE_JWT
    }));    
}

const RealtimeProvider = ({ state, dispatch }) => {

    useEffect(() => {        
        socket.onmessage = ({data}) => {
            console.log('WS_MSG', data)                 
        }       
    }, []);

    return (
      <></>
    )
  }

  


export {
    RealtimeProvider,
    socket
}

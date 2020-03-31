import React, { useEffect, useGlobal } from 'reactn'


export default (props) => {
    //const [messages, setMessages] = useGlobal('messages');
    return (
        <div style={{ textAlign: 'center', width: '600px', margin: '50px auto' }}>
            {props.data}
        </div>
    )
}

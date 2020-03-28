import React, { useContext, useEffect, Component } from 'react'

import axios from 'axios'

import {
    GlobalDispatchContext,
    GlobalStateContext,
} from "../../utils/context"


export default (props) => {
    const dispatch = useContext(GlobalDispatchContext)
    const state = useContext(GlobalStateContext)
    //setState({'asd':'asd'})
    console.log(state)
    

    useEffect(() => {
        axios
            .get(`https://dog.ceo/api/breeds/image/random`)
            .then(pupper => {
                const {
                    data: { message: img },
                } = pupper
                const breed = img.split('/')[4]
                dispatch({ type: "ITEM_UPDATED", data: { fn: breed } })
            })
            .catch(console.log)
    }, []);

    //const { img, breed } = state.pupper

    return (
        <div style={{ textAlign: 'center', width: '600px', margin: '50px auto' }}>
            {state.item.fn}
        </div>
    )
}

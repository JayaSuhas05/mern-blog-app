import React from 'react'
import LoadingGif from '../loading.gif'
const Loader = () => {
  return (
    <div className='loader'>
      <div className="loader__image">
        <img src={LoadingGif} className='loader__gif'  alt="" />
      </div>
    </div>
  )
}
export default Loader

import React from "react"

const Page = props => (
  <div
    className="page"
    style={{ background: `hsl(${props.page * 75}, 60%, 60%)` }}
  >
    <p>{props.page}</p>
  </div>
)

export default Page

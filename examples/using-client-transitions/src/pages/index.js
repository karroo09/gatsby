import React from "react"
import { Router, Link, Location } from "@reach/router"
import { TransitionGroup, CSSTransition } from "react-transition-group"
import "./main.css"

const App = () => (
  <div className="app">
    <nav className="nav">
      <Link to="/" state={{ page: 1 }}>Page 1</Link> <Link to="page/2">Page 2</Link>
      {` `}
      <Link to="page/3">Page 3</Link> <Link to="page/4">Page 4</Link>
    </nav>

    <SlideTransitionRouter>
      <Page path="/" page="1" />
      <Page path="page/:page" />
    </SlideTransitionRouter>
  </div>
)

const SlideTransitionRouter = ({ children }) => (
  <Location>
    {({ location }) => {
    return (
      <TransitionGroup>
        <CSSTransition
          key={location.key}
          timeout={2500}
          classNames='slide'
        >
          <Router location={location}>{children}</Router> 
        </CSSTransition>
      </TransitionGroup>
    )}}
  </Location>
)

const Page = props => (
  <div
    className="page"
    style={{ background: `hsl(${props.page * 75}, 60%, 60%)` }}
  >
    {props.page}
  </div>
)

export default App

import React from "react"
import { Router, Link, Location } from "@reach/router"
import { TransitionGroup, CSSTransition } from "react-transition-group"

import Page from "./page"

import "../styles/main.css"

const SlideTransitionRouter = ({ children }) => (
  <Location>
    {({ location }) => {
      return (
        <TransitionGroup>
          <CSSTransition
            key={location.pathname}
            timeout={2500}
            classNames="slide"
          >
            <Router location={location}>{children}</Router>
          </CSSTransition>
        </TransitionGroup>
      )
    }}
  </Location>
)

class DefaultLayout extends React.Component {
  render() {
    return (
      <div className="app">
        <nav className="nav">
          <Link to="/">Page 1</Link> <Link to="page/2">Page 2</Link>
          {` `}
          <Link to="page/3">Page 3</Link> <Link to="page/4">Page 4</Link>
        </nav>

        <SlideTransitionRouter>
          <Page path="/" page="1" />
          <Page path="page/:page" />
        </SlideTransitionRouter>
      </div>
    )
  }
}

export default DefaultLayout

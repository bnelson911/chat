import React from 'react';
import 'whatwg-fetch';
import Url from 'url';

class Iframely extends React.Component {

  constructor() {
    super();
    this.state = {
      iframelyResponse: null,
    }
  }

  componentWillMount() {
    if(!this.props.url) {
      return null;
    }
    this.loadUrl(this.props.url);
  }

  loadUrl(url) {
    console.log("loading iframely for", url);
    var u = Url.parse("https://iframe.ly/api/iframely");
    u.query = {"api_key": "a09c4dfedf62021c92999a",
               "url": url,
               "omit_script": true,
               "iframe": true};
    fetch(Url.format(u))
    .then(res => res.json())
    .then(data => this.setState({iframelyResponse: data}));
  }

  componentWillUpdate(nextProps) {
    if(!nextProps.url) {
      return null;
    }

    if (this.props.url === nextProps.url) {
      return;
    }
    this.loadUrl(this.props.url);
  }

  componentDidMount() {
    window.iframely && iframely.load();
  }

  getIframelyHtml() {
  // If you use embed code from API
    if(!this.state.iframelyResponse || ! this.state.iframelyResponse.html){
      return null;
    }
    return {__html: this.state.iframelyResponse.html};
  // Alternatively, if you use plain embed.js approach without API calls:
  // return {__html: '<a href="' + this.props.url + '" data-iframely-url></a>'};
  // no title inside <a> eliminates the flick
  }

  render() {

    if(!this.state.iframelyResponse || ! this.state.iframelyResponse.html){
      return <a href={this.props.url}>{this.props.url}</a>;
    }

    var style = {
      width: Bebo.Utils.isMobile() ? "100%" : "50%",
      height: "120px",
      maxHeight: "120px",
      overflowY: "hidden",
    };

    return <div style={style} dangerouslySetInnerHTML={this.getIframelyHtml()} />
  }
  
}

Iframely.displayName = 'Iframely';

// Uncomment properties you need
// Iframely.propTypes = {};
// Iframely.defaultProps = {};


export default Iframely;

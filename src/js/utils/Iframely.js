import React from 'react';
import 'whatwg-fetch';
import Url from 'url';
// import _ from 'lodash';

var onMessage = function(e) {
  // console.log(e.origin, JSON.stringify(e.data));
  if (typeof(e.data) ==='string') {
    try {
      var data = JSON.parse(e.data);
      if (data.method === "resize" || data.method === "widgetRendered") {
        var iframes = document.getElementsByTagName("iframe");
        for (var i=0; i< iframes.length; i++) {
          var f = iframes[i];
          if (e.source === f.contentWindow) {
            console.log("found iframe", f, data);
            var event = new Event("resize");
            event.height = data.height;
            _.defer(() => f.dispatchEvent(event));
          }
        }
      }
    } catch (err) {
    }
  }
}

var subscribed = false;

class Iframely extends React.Component {

  constructor() {
    super();
    this.state = {
      iframelyResponse: null,
      height: "200px",
    }
    if (!subscribed) {
      window.addEventListener("message", onMessage, false);
      subscribed = true;
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
               "lazy": false,
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
    // window.iframely && iframely.load();
  }

  componentDidUpdate() {
    window.iframely && iframely.load();
    var embed = this.refs.embed;
    if (!embed) {
      return;
    }

    var iframes = embed.getElementsByTagName("iframe");
    if (iframes && iframes.length >0) {
      var iframe = iframes[0];
      iframe.onload = (event) => {
          console.log("onLoad", this.props.url, event.currentTarget.offsetHeight);
          setTimeout(() => this.onResize(event, embed), 100);
      };
      iframe.onresize= (event) => {
          console.log("resize", this.props.url, event.currentTarget.offsetHeight);
          this.onResize(event, embed);
      };
    }

    this.onResize({}, embed);
  }

  onResize(event, embed) {
    console.log("onResize", event, embed);
    var height;
    if (event.height) {
      height = event.height + "px";;
      if (event.currentTarget && event.currentTarget.offsetHeight) {
        height = event.currentTarget.offsetHeight + "px";
      }
    } else {
      if (embed.children && embed.children.length >0) {
        height = embed.children[0].offsetHeight + "px";
      }
    }
    console.log("iframely.onResize", event.type, this.props.url, height);
    if (height !== this.state.height) {
      this.setState({height});
    }
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
      height: this.state.height,
      overflowY: "hidden",
    };

    return <div ref="embed" style={style} dangerouslySetInnerHTML={this.getIframelyHtml()} />
  }
  
}

Iframely.displayName = 'Iframely';

// Uncomment properties you need
// Iframely.propTypes = {};
// Iframely.defaultProps = {};


export default Iframely;

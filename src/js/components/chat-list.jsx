import React from 'react';
import ChatItem from './chat-item.jsx';

import '../../css/_chat-list.scss';

const COUNT=10;

class ChatList extends React.Component {

  constructor() {
    super();
    this.state = {
      maxCount: 50,
      scrolledPastFirstMessage: false,
      isScrolling: false,
      messages: [],
      unloadedMessages: [],
      usersTypingCount: 0,
      hasMore: true,
    };
    this.hasMore = true;
    this.offset = 0;
    this.store = [];
    this.usersTyping = {};
    this.getMessages = this.getMessages.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleEventUpdate = this.handleEventUpdate.bind(this);
    this.handleMessageEvent = this.handleMessageEvent.bind(this);
    this.addNewMessages = this.addNewMessages.bind(this);
    this.handlePresenceUpdates = this.handlePresenceUpdates.bind(this);
    this.scrollChatToBottom = this.scrollChatToBottom.bind(this);
    this.handleNewMessage = this.handleNewMessage.bind(this);
    this.updatePresence = this.updatePresence.bind(this);
    this.handleListClick = this.handleListClick.bind(this);
    this.renderNoChatsMessage = this.renderNoChatsMessage.bind(this);
    this.renderMessagesBadge = this.renderMessagesBadge.bind(this);
    this.renderUsersAreTyping = this.renderUsersAreTyping.bind(this);
    this.renderChatList = this.renderChatList.bind(this);
    this.loadMore = this.loadMore.bind(this);
  }

  componentWillMount() {
    // eslint-disable-next-line
    Bebo.onEvent(this.handleEventUpdate);
  }

  componentDidMount() {
    this.handleScroll();
  }

  componentDidUpdate() {
    console.log("componentDidUpdate");
    this.handleScroll();
  }

  componentWillUnmount() {
    if(this.presenceTimeout) {
      clearTimeout(this.presenceTimeout);
    }
    if(this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }
  }
  loadMore(offset) {
    console.log("loading more posts", offset);
    return this.getMessages(COUNT, offset);
  }

  getMessages(count, offset) {

    if (!offset) {
      offset = 0;
    }
    var that = this;
    var options = {count, offset, sort_by:"created_dttm", sort_order: "desc"};
    Bebo.Db.get('messages', options)
      .then(function (data) {
        var hasMore;
        if (options.count) { 
          hasMore = data.result.length === options.count;
          console.log("loading - hasmore", hasMore, data.result.length, options.count);
        }
        var state = {};
        that.offset = that.offset + options.count;
        if (options.count) {
          that.hasMore = hasMore;
          state.hasMore = hasMore;
        }
        that.store = _.unionBy(data.result, that.store, "id");
        that.store = _.orderBy(that.store, "created_dttm", "asc");
        state.messages = that.store;
        that.setState(state);
      }).catch((err) => console.log('error getting list:', err, err.stack));
  }

  handleScroll() {

    const list = this.refs.chatListInner;
    const item = this.refs.chats.lastChild;
    const diff = list.scrollHeight - list.offsetHeight - item.clientHeight;

    if (list.scrollTop < 200 && this.hasMore) {
      this.loadMore(this.offset);
    }

    if (list.scrollTop <= diff && !this.state.scrolledPastFirstMessage) {
      this.setState({ scrolledPastFirstMessage: true });
    } else if (list.scrollTop >= diff && this.state.scrolledPastFirstMessage) {
      this.scrollChatToBottom();
    }
  }

  handleEventUpdate(data) {
    if (data.type === 'chat_sent') {
      this.handleMessageEvent(data.message);
    }
    if (data.type === 'chat_presence') {
      this.handlePresenceUpdates(data.presence);
    }
  }

  handleMessageEvent(message) {
    if (!this.state.scrolledPastFirstMessage) {
      this.addNewMessages([message]);
      if (message.user_id === this.props.actingUser.user_id) { this.scrollChatToBottom(); }
    } else {
      const messages = this.state.unloadedMessages;
      messages.push(message);
      this.setState({ unloadedMessages: messages });
    }
  }

  addNewMessages(arr) {
    const messages = this.state.messages.concat(arr);
    this.setState({
      messages,
      unloadedMessages: [],
    });
  }

  handlePresenceUpdates(user) {
    if (user.started_typing === this.props.actingUser.user_id || user.stopped_typing === this.props.actingUser.user_id) {
      return;
    }
    if(this.presenceTimeout) {
      clearTimeout(this.presenceTimeout);
    }
    this.presenceTimeout = setTimeout(() => {
      if(this.presenceInterval) {
        clearInterval(this.presenceInterval);
      }
    }, 4000);

    if (user.started_typing) {
      this.usersTyping[user.started_typing] = Date.now();

      if (!this.presenceInterval) {
        this.updatePresence();
        this.presenceInterval = setInterval(this.updatePresence, 3000);
      }
    } else if (user.stopped_typing && this.usersTyping[user.stopped_typing]) {
      delete this.usersTyping[user.stopped_typing];
      this.updatePresence();
    }
  }
  updatePresence() {
    const usersTypingCount = Object.keys(this.usersTyping).length;
    if(usersTypingCount === 0) {
      clearInterval(this.presenceInterval);
    }
    this.setState({ usersTypingCount });
  }
  scrollChatToBottom() {
    if (this.state.unloadedMessages.length > 0) {
      this.addNewMessages(this.state.unloadedMessages);
    }
    this.refs.chatListInner.scrollTop = this.refs.chatListInner.scrollHeight;

    this.setState({
      scrolledPastFirstMessage: false,
    });
  }


  handleNewMessage() {
    if (!this.state.scrolledPastFirstMessage) {
      this.scrollChatToBottom();
    }
  }

  handleListClick() {
    this.props.blurChat();
  }

  // Renders

  renderNoChatsMessage() {
    if (!this.state.messages || this.state.messages.length === 0) {
      return <div className="chat-list--no-messages" />;
    }
  }

  renderMessagesBadge() {
    if (this.state.unloadedMessages.length > 0) {
      return (<div className="chat-list--unseen-messages" onClick={this.scrollChatToBottom}>
        <span className="chat-list--unseen-messages--text">{`${this.state.unloadedMessages.length} New Messages`}</span>
      </div>);
    }
    return null;
  }

  renderUsersAreTyping() {
    const count = this.state.usersTypingCount;
    return (<div className="chat-list--users-typing" style={count > 0 ? {} : { transform: 'translate3d(0,100%,0)' }}>
      <span className="chat-list--users-typing--text">{count === 1 ? '1 person is typing right now...' : `${count} people are typing right now...`}</span>
    </div>);
  }

  renderChatList() {
    const { hasMore, messages } = this.state;
    return (
      <div ref="chatListInner" className="chat-list--inner" onScroll={this.handleScroll} onClick={this.handleListClick}>
        <ul ref="chats" className="chat-list--inner--list">
          {hasMore ?  <div style={{clear: 'both'}} className="loader">Loading ...</div> : ""}
          {messages.map((item, i) => <ChatItem handleNewMessage={this.handleNewMessage} item={item} prevItem={messages[i - 1] || {}} key={item.id} />)}
          {this.renderNoChatsMessage}
        </ul>
      </div>
    );
  }

  render() {
    const count = this.state.usersTypingCount;
    return (<div className="chat-list">
      {this.renderMessagesBadge()}
      {this.renderChatList()}
      {this.renderUsersAreTyping()}
    </div>);
  }

}

ChatList.displayName = 'ChatList';

// Uncomment properties you need
ChatList.propTypes = {
  blurChat: React.PropTypes.func.isRequired,
  actingUser: React.PropTypes.object.isRequired,
};
// ChatList.defaultProps = {};

export default ChatList;

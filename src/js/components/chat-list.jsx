import React from 'react';
import ChatItem from './chat-item.jsx';
import InfiniteScroll from 'react-infinite-scroller';

import '../../css/_chat-list.scss';

const COUNT=25;

class ChatList extends React.Component {

  constructor() {
    super();
    this.state = {
      maxCount: 50,
      hasMore: true,
      offset: 0,
      scrolledPastFirstMessage: false,
      isScrolling: false,
      messages: [],
      unloadedMessages: [],
      usersTypingCount: 0,
    };
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

  componentWillUnmount() {
    if(this.presenceTimeout) {
      clearTimeout(this.presenceTimeout);
    }
    if(this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }
  }
  loadMore(pageToLoad) {
    var offset = (pageToLoad - 1) * COUNT; // infinite-scroller does + 1
    console.log("loading more posts", offset);
    return this.getMessages(COUNT, offset);
  }

  getMessages(count, offset) {

    if (!offset) {
      offset = 0;
    }
    var that = this;
    
    var options = {count, offset};
    Bebo.Db.get('messages', options, (err, data) => {
      if (err) {
        console.log('error getting list');
        return;
      }
      var hasMore;
      if (options.count) { 
        hasMore = data.result.length === options.count;
      }
      var state = {};
      if (options.count) {
        state.pageToLoad = this.state.messages.length;
        state.offset = options.offset;
        state.hasMore = hasMore;
      }
      var list = data.result.reverse();
      list = _.unionBy(list, that.state.messages, "id");
      list = _.orderBy(list, "created_dttm", "asc");
      state.messages = list;
      that.setState(state);
    });
  }

  handleScroll() {
    const list = this.refs.chatListInner;
    const item = this.refs.chats.lastChild;

    const diff = list.scrollHeight - list.offsetHeight - item.clientHeight;

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
    const { messages } = this.state;
    return (
      <ul ref="chats" className="chat-list--inner--list">
          <InfiniteScroll pageStart={this.state.offset}
            hasMore={this.state.hasMore}
            loadMore={this.loadMore}
            useWindow={false}
            loader={<div style={{clear: 'both'}} className="loader">Loading ...</div>}>
              {messages.map((item, i) => <ChatItem handleNewMessage={this.handleNewMessage} item={item} prevItem={messages[i - 1] || {}} key={item.id} />)}
          </InfiniteScroll>
          {this.renderNoChatsMessage}
      </ul>
    );
  }

  render() {
    const count = this.state.usersTypingCount;
    return (<div className="chat-list">
      {this.renderMessagesBadge()}
      <div style={count > 0 ? { transform: 'translate3d(0,-37px,0)' } : {}} ref="chatListInner" className="chat-list--inner" onScroll={this.handleScroll} onClick={this.handleListClick}>
        {this.renderChatList()}
      </div>
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

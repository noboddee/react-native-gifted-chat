/* eslint react-native/no-inline-styles: 0 */

import PropTypes from 'prop-types'
import React from 'react'
import {
  TouchableWithoutFeedback,
  TouchableHighlight,
  TouchableOpacity,
  Text,
  View,
  ViewPropTypes,
  StyleSheet
} from 'react-native'
import { Avatar, Bubble, Day, SystemMessage } from 'react-native-gifted-chat'
import { isSameDay, isSameUser } from 'react-native-gifted-chat/src/utils'

// import { isSameUser, isSameDay } from './utils'

const styles = {
  btnInvitContainer: {
    zIndex: 100,
    marginVertical: 10,
    paddingHorizontal: 30,
    flexDirection: 'row',
    width: '100%'
  },
  invitBtn: {
    flex: 1,
    backgroundColor: '#3BB7B4',
    height: 50,
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6
  },
  invitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18
  },

  left: StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      marginLeft: 8,
      marginRight: 0
    }
  }),
  right: StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      marginLeft: 0,
      marginRight: 8
    }
  })
}

export default class MessageComp extends React.Component {
  state = {
    isInvit: false,
    onLoadFootDetail: false,
    foot: null
  }

  componentDidMount () {
    console.log('componentDidMount MessageComp')
    const {currentMessage} = this.props
    const {isInvit, footId} = currentMessage

    this.loadFoot(footId)
    this.setState({
      isInvit
    })
  }

  async loadFoot (footId) {
    this.setState({
      onLoadFootDetail: true
    })
    console.log('footId', footId)
    const foot = await this.props.getFoot(footId)
    this.setState({
      onLoadFootDetail: false,
      foot
    })
  }

  shouldComponentUpdate (nextProps, nextState) {
    const next = nextProps.currentMessage
    const current = this.props.currentMessage
    const currentState = this.state
    return (
      next.send !== current.send ||
      next.received !== current.received ||
      next.pending !== current.pending ||
      next.createdAt !== current.createdAt ||
      next.text !== current.text ||
      next.image !== current.image ||
      next.video !== current.video ||
      nextState.isInvit !== currentState.isInvit ||
      nextState.onLoadFootDetail !== currentState.onLoadFootDetail ||
      nextState.footId !== currentState.footId
    )
  }

  getInnerComponentProps = () => {
    const {containerStyle, ...props} = this.props
    return {
      ...props,
      isSameUser,
      isSameDay
    }
  }

  renderDay () {
    if (this.props.currentMessage.createdAt) {
      const dayProps = this.getInnerComponentProps()
      if (this.props.renderDay) {
        return this.props.renderDay(dayProps)
      }
      return <Day {...dayProps} />
    }
    return null
  }

  renderBubble () {
    const bubbleProps = this.getInnerComponentProps()
    const {isInvit, onLoadFootDetail, foot} = this.state

    if (this.props.renderBubble) {
      return this.props.renderBubble(bubbleProps)
    }
    return <Bubble {...bubbleProps} {...this.state}/>
  }

  renderSystemMessage () {
    const systemMessageProps = this.getInnerComponentProps()
    if (this.props.renderSystemMessage) {
      return this.props.renderSystemMessage(systemMessageProps)
    }
    return <SystemMessage {...systemMessageProps} />
  }

  renderAvatar () {
    if (this.props.user._id === this.props.currentMessage.user._id && !this.props.showUserAvatar) {
      return null
    }
    const avatarProps = this.getInnerComponentProps()
    const {currentMessage} = avatarProps
    if (currentMessage.user.avatar === null) {
      return null
    }
    return <Avatar {...avatarProps} />
  }

  onInvitationAction (response) {
    this.props.invitAction(this.state.footId, response, this.props.currentMessage)
  }

  renderBtn () {
    if (!this.state.isInvit || !this.state.foot) {
      return null
    }

    return (
      <View style={styles.btnInvitContainer}>
        <TouchableHighlight
          style={styles.invitBtn}
          onPress={() => this.onInvitationAction(false)}>
          <View style={styles.invitBtn}>
            <Text style={styles.invitBtnText}>NON</Text>
          </View>
        </TouchableHighlight>
        <TouchableOpacity
          style={styles.invitBtn}
          onPress={() => this.onInvitationAction(true)}>
          <View>
            <Text style={styles.invitBtnText}>OUI</Text>
          </View>
        </TouchableOpacity>
      </View>
    )
  }

  render () {
    const sameUser = isSameUser(this.props.currentMessage, this.props.nextMessage)
    return (
      <View>
        {this.renderDay()}
        {this.props.currentMessage.system ? (
          this.renderSystemMessage()
        ) : (
          <View
            style={[
              styles[this.props.position].container,
              {marginBottom: sameUser ? 2 : 10},
              !this.props.inverted && {marginBottom: 2},
              this.props.containerStyle[this.props.position]
            ]}
          >
            {this.props.position === 'left' ? this.renderAvatar() : null}
            {this.renderBubble()}
            {this.props.position === 'right' ? this.renderAvatar() : null}
          </View>
        )}
        {this.renderBtn()}
      </View>
    )
  }

}

MessageComp.defaultProps = {
  renderAvatar: undefined,
  renderBubble: null,
  renderDay: null,
  renderSystemMessage: null,
  position: 'left',
  currentMessage: {},
  nextMessage: {},
  previousMessage: {},
  user: {},
  containerStyle: {},
  showUserAvatar: true,
  inverted: true
}

MessageComp.propTypes = {
  renderAvatar: PropTypes.func,
  showUserAvatar: PropTypes.bool,
  renderBubble: PropTypes.func,
  renderDay: PropTypes.func,
  renderSystemMessage: PropTypes.func,
  position: PropTypes.oneOf(['left', 'right']),
  currentMessage: PropTypes.object,
  nextMessage: PropTypes.object,
  previousMessage: PropTypes.object,
  user: PropTypes.object,
  inverted: PropTypes.bool,
  containerStyle: PropTypes.shape({
    left: ViewPropTypes.style,
    right: ViewPropTypes.style
  })
}

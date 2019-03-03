/* eslint no-use-before-define: ["error", { "variables": false }] */

import moment from 'moment/moment'
import PropTypes from 'prop-types'
import React from 'react'
import {
  ActivityIndicator,
  Text,
  Clipboard,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewPropTypes
} from 'react-native'

import MessageText from './MessageText'
import MessageImage from './MessageImage'
import MessageVideo from './MessageVideo'

import Time from './Time'
import Color from './Color'

import { isSameUser, isSameDay } from './utils'

export default class Bubble extends React.Component {
  onLongPress = () => {
    if (this.props.onLongPress) {
      this.props.onLongPress(this.context, this.props.currentMessage)
    } else if (this.props.currentMessage.text) {
      const options = ['Copier', 'Annuler']
      const cancelButtonIndex = options.length - 1
      this.context.actionSheet().showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              Clipboard.setString(this.props.currentMessage.text)
              break
            default:
              break
          }
        }
      )
    }
  }

  handleBubbleToNext () {
    if (
      isSameUser(this.props.currentMessage, this.props.nextMessage) &&
      isSameDay(this.props.currentMessage, this.props.nextMessage)
    ) {
      return StyleSheet.flatten([
        styles[this.props.position].containerToNext,
        this.props.containerToNextStyle[this.props.position]
      ])
    }
    return null
  }

  handleBubbleToPrevious () {
    if (
      isSameUser(this.props.currentMessage, this.props.previousMessage) &&
      isSameDay(this.props.currentMessage, this.props.previousMessage)
    ) {
      return StyleSheet.flatten([
        styles[this.props.position].containerToPrevious,
        this.props.containerToPreviousStyle[this.props.position]
      ])
    }
    return null
  }

  renderMessageText () {
    if (this.props.currentMessage.text) {
      const {containerStyle, wrapperStyle, ...messageTextProps} = this.props
      if (this.props.renderMessageText) {
        return this.props.renderMessageText(messageTextProps)
      }
      return <MessageText {...messageTextProps} />
    }
    return null
  }

  renderMessageCustomText (message, textStyle = {}) {
    if (message) {
      const {containerStyle, wrapperStyle, ...messageTextProps} = this.props
      if (this.props.renderMessageText) {
        return this.props.renderMessageText(messageTextProps)
      }
      return <MessageText
        {...messageTextProps}
        customTextStyle={textStyle}
        currentMessage={{text: message}}
      />
    }
    return null
  }

  renderMessageImage () {
    if (this.props.currentMessage.image) {
      const {containerStyle, wrapperStyle, ...messageImageProps} = this.props
      if (this.props.renderMessageImage) {
        return this.props.renderMessageImage(messageImageProps)
      }
      return <MessageImage {...messageImageProps} />
    }
    return null
  }

  renderMessageCustomImage (image) {
    if (image) {
      const {containerStyle, wrapperStyle, ...messageImageProps} = this.props
      if (this.props.renderMessageImage) {
        return this.props.renderMessageImage(messageImageProps)
      }
      return <MessageImage
        {...messageImageProps}
        imageStyle={styles.customImage}
        currentMessage={{image}}
      />
    }
    return null
  }

  renderMessageVideo () {
    if (this.props.currentMessage.video) {
      const {containerStyle, wrapperStyle, ...messageVideoProps} = this.props
      if (this.props.renderMessageVideo) {
        return this.props.renderMessageVideo(messageVideoProps)
      }
      return <MessageVideo {...messageVideoProps} />
    }
    return null
  }

  renderTicks () {
    const {currentMessage} = this.props
    if (this.props.renderTicks) {
      return this.props.renderTicks(currentMessage)
    }
    if (currentMessage.user._id !== this.props.user._id) {
      return null
    }
    if (currentMessage.sent || currentMessage.received || currentMessage.pending) {
      return (
        <View style={styles.tickView}>
          {currentMessage.sent && <Text style={[styles.tick, this.props.tickStyle]}>✓</Text>}
          {currentMessage.received && <Text style={[styles.tick, this.props.tickStyle]}>✓</Text>}
          {currentMessage.pending && <Text style={[styles.tick, this.props.tickStyle]}>🕓</Text>}
        </View>
      )
    }
    return null
  }

  renderTime () {
    if (this.props.currentMessage.createdAt) {
      const {containerStyle, wrapperStyle, ...timeProps} = this.props
      if (this.props.renderTime) {
        return this.props.renderTime(timeProps)
      }
      return <Time {...timeProps} />
    }
    return null
  }

  renderUsername () {
    const {currentMessage} = this.props
    if (this.props.renderUsernameOnMessage) {
      if (currentMessage.user._id === this.props.user._id) {
        return null
      }
      return (
        <View style={styles.usernameView}>
          <Text style={[styles.username, this.props.usernameStyle]}>~ {currentMessage.user.name}</Text>
        </View>
      )
    }
    return null
  }

  renderCustomView () {
    if (this.props.renderCustomView) {
      return this.props.renderCustomView(this.props)
    }
    return null
  }

  renderMainContainer () {
    const {isInvit, onLoadFootDetail, foot, playerIsPresent} = this.props
    if (!isInvit) {
      return (
        <View>
          {this.renderCustomView()}
          {this.renderMessageImage()}
          {this.renderMessageVideo()}
          {this.renderMessageText()}
        </View>
      )
    }

    if (onLoadFootDetail) {
      return (
        <View style={{width: 250, height: 200, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="#535353"/>
        </View>
      )
    }

    if (!foot) {
      // Invitation plus valable
      return this.renderMessageCustomText('La partie n\'est plus disponible')
    }

    const nberPlace = foot.get('playerNber') - foot.get('partNber')
    const owner = foot.get('owner')
    const place = foot.get('place')
    const picture = place.get('picture').url()
    const price = foot.get('price')
      ? ` - ${foot.get('price')}€/personnes`
      : ''
    const date = moment(foot.get('date')).format('dddd D MMM HH:mm')

    const isComplete = nberPlace < 1

    let title = isComplete
      ? `La partie de ${owner.get('pseudo')} est maintenant complète..`
      : `${owner.get('pseudo')} cherhche ${nberPlace} ${nberPlace > 1 ? 'joueurs' : 'joueur'}. Tu es dispo ?`

    if (playerIsPresent) {
      title = 'Tu es déjà dans ce match'
    }

    const detailTxt = isComplete
      ? null
      : `${date} - ${nberPlace} ${nberPlace > 1 ? 'places' : 'place'} dispo${price}`

    return (
      <View>
        {this.renderMessageCustomText(title)}
        {this.renderMessageCustomImage(picture)}
        <Text style={styles.detailTxt}>{detailTxt}</Text>
        <View style={styles.placeContainer}>
          {this.props.pinIcon()}
          <Text style={styles.placeTxt}>{place.get('name')}</Text>
        </View>
      </View>
    )
  }

  render () {
    return (
      <View style={[styles[this.props.position].container, this.props.containerStyle[this.props.position]]}>
        <View
          style={[
            styles[this.props.position].wrapper,
            this.props.wrapperStyle[this.props.position],
            this.handleBubbleToNext(),
            this.handleBubbleToPrevious()
          ]}
        >
          <TouchableWithoutFeedback
            onLongPress={this.onLongPress}
            accessibilityTraits="text"
            {...this.props.touchableProps}
          >
            <View>
              {this.renderMainContainer()}
              <View style={[styles[this.props.position].bottom, this.props.bottomContainerStyle[this.props.position]]}>
                {this.renderUsername()}
                {this.renderTime()}
                {this.renderTicks()}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    )
  }

}

const styles = {
  left: StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'flex-start'
    },
    wrapper: {
      borderRadius: 15,
      backgroundColor: Color.leftBubbleBackground,
      marginRight: 60,
      minHeight: 20,
      justifyContent: 'flex-end'
    },
    containerToNext: {
      borderBottomLeftRadius: 3
    },
    containerToPrevious: {
      borderTopLeftRadius: 3
    },
    bottom: {
      flexDirection: 'row',
      justifyContent: 'flex-start'
    }
  }),
  right: StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'flex-end'
    },
    wrapper: {
      borderRadius: 15,
      backgroundColor: Color.defaultBlue,
      marginLeft: 60,
      minHeight: 20,
      justifyContent: 'flex-end'
    },
    containerToNext: {
      borderBottomRightRadius: 3
    },
    containerToPrevious: {
      borderTopRightRadius: 3
    },
    bottom: {
      flexDirection: 'row',
      justifyContent: 'flex-end'
    }
  }),
  tick: {
    fontSize: 10,
    backgroundColor: Color.backgroundTransparent,
    color: Color.white
  },
  tickView: {
    flexDirection: 'row',
    marginRight: 10
  },
  username: {
    top: -3,
    left: 0,
    fontSize: 12,
    backgroundColor: 'transparent',
    color: '#aaa'
  },
  usernameView: {
    flexDirection: 'row',
    marginHorizontal: 10
  },

  customImage: {
    width: '100%',
    height: 120,
    borderRadius: 0,
    margin: 0,
    resizeMode: 'cover'
  },

  detailTxt: {
    flexWrap: 'wrap',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 10,
    marginRight: 10
  },
  placeContainer: {
    flexDirection: 'row',
    marginLeft: 10,
    alignItems: 'center'
  },
  placeTxt: {
    color: '#535353',
    flexWrap: 'wrap',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 10,
    marginRight: 10
  }
}

Bubble.contextTypes = {
  actionSheet: PropTypes.func
}

Bubble.defaultProps = {
  touchableProps: {},
  onLongPress: null,
  renderMessageImage: null,
  renderMessageVideo: null,
  renderMessageText: null,
  renderCustomView: null,
  renderUsername: null,
  renderTicks: null,
  renderTime: null,
  position: 'left',
  currentMessage: {
    text: null,
    createdAt: null,
    image: null
  },
  nextMessage: {},
  previousMessage: {},
  containerStyle: {},
  wrapperStyle: {},
  bottomContainerStyle: {},
  tickStyle: {},
  usernameStyle: {},
  containerToNextStyle: {},
  containerToPreviousStyle: {}
}

Bubble.propTypes = {
  user: PropTypes.object.isRequired,
  touchableProps: PropTypes.object,
  onLongPress: PropTypes.func,
  renderMessageImage: PropTypes.func,
  renderMessageVideo: PropTypes.func,
  renderMessageText: PropTypes.func,
  renderCustomView: PropTypes.func,
  renderUsernameOnMessage: PropTypes.bool,
  renderUsername: PropTypes.func,
  renderTime: PropTypes.func,
  renderTicks: PropTypes.func,
  position: PropTypes.oneOf(['left', 'right']),
  currentMessage: PropTypes.object,
  nextMessage: PropTypes.object,
  previousMessage: PropTypes.object,
  containerStyle: PropTypes.shape({
    left: ViewPropTypes.style,
    right: ViewPropTypes.style
  }),
  wrapperStyle: PropTypes.shape({
    left: ViewPropTypes.style,
    right: ViewPropTypes.style
  }),
  bottomContainerStyle: PropTypes.shape({
    left: ViewPropTypes.style,
    right: ViewPropTypes.style
  }),
  tickStyle: Text.propTypes.style,
  usernameStyle: Text.propTypes.style,
  containerToNextStyle: PropTypes.shape({
    left: ViewPropTypes.style,
    right: ViewPropTypes.style
  }),
  containerToPreviousStyle: PropTypes.shape({
    left: ViewPropTypes.style,
    right: ViewPropTypes.style
  })
}

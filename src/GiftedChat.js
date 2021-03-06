/* eslint
    no-param-reassign: 0,
    no-use-before-define: ["error", { "variables": false }],
    no-return-assign: 0,
    no-mixed-operators: 0,
    react/sort-comp: 0
*/

import ActionSheet from '@expo/react-native-action-sheet'
import moment from 'moment'

import frLocale from 'moment/locale/fr'
import PropTypes from 'prop-types'
import React from 'react'
import { Animated, Dimensions, Keyboard, Platform, StyleSheet, View } from 'react-native'
import uuid from 'uuid'
import Actions from './Actions'
import Avatar from './Avatar'
import Bubble from './Bubble'
import Composer from './Composer'
import { DATE_FORMAT, DEFAULT_PLACEHOLDER, MAX_COMPOSER_HEIGHT, MIN_COMPOSER_HEIGHT, TIME_FORMAT } from './Constant'
import Day from './Day'
import GiftedAvatar from './GiftedAvatar'
import InputToolbar from './InputToolbar'
import LoadEarlier from './LoadEarlier'
import Message from './Message'
import MessageContainer from './MessageContainer'
import MessageImage from './MessageImage'
import MessageText from './MessageText'
import Send from './Send'
import SystemMessage from './SystemMessage'
import Time from './Time'

import * as utils from './utils'

moment.locale('fr', frLocale)

class GiftedChat extends React.Component {

  constructor (props) {
    super(props)

    // default values
    this._isMounted = false
    this._keyboardHeight = 0
    this._bottomOffset = 0
    this._maxHeight = null
    this._isFirstLayout = true
    this._locale = 'en'
    this._messages = []

    this.state = {
      isInitialized: false, // initialization will calculate maxHeight before rendering the chat
      composerHeight: MIN_COMPOSER_HEIGHT,
      messagesContainerHeight: null,
      typingDisabled: false,
      subsituteKeyboardViewIsShowing: false
    }

    this.onKeyboardWillShow = this.onKeyboardWillShow.bind(this)
    this.onKeyboardWillHide = this.onKeyboardWillHide.bind(this)
    this.onKeyboardDidShow = this.onKeyboardDidShow.bind(this)
    this.onKeyboardDidHide = this.onKeyboardDidHide.bind(this)
    this.onMoveShouldSetPanResponder = this.onMoveShouldSetPanResponder.bind(this)
    this.onPanResponderMove = this.onPanResponderMove.bind(this)
    this.onPanResponderRelease = this.onPanResponderRelease.bind(this)
    this.onSend = this.onSend.bind(this)
    this.getLocale = this.getLocale.bind(this)
    this.onInputSizeChanged = this.onInputSizeChanged.bind(this)
    this.onInputTextChanged = this.onInputTextChanged.bind(this)
    this.onMainViewLayout = this.onMainViewLayout.bind(this)
    this.onInitialLayoutViewLayout = this.onInitialLayoutViewLayout.bind(this)

    this.invertibleScrollViewProps = {
      inverted: this.props.inverted,
      keyboardShouldPersistTaps: this.props.keyboardShouldPersistTaps,
      onKeyboardWillShow: this.onKeyboardWillShow,
      onKeyboardWillHide: this.onKeyboardWillHide,
      onKeyboardDidShow: this.onKeyboardDidShow,
      onKeyboardDidHide: this.onKeyboardDidHide,
      onMoveShouldSetPanResponder: this.onMoveShouldSetPanResponder,
      onPanResponderMove: this.onPanResponderMove,
      onPanResponderRelease: this.onPanResponderRelease
    }
  }

  static append (currentMessages = [], messages, inverted = true) {
    if (!Array.isArray(messages)) {
      messages = [messages]
    }
    return inverted ? messages.concat(currentMessages) : currentMessages.concat(messages)
  }

  static prepend (currentMessages = [], messages, inverted = true) {
    if (!Array.isArray(messages)) {
      messages = [messages]
    }
    return inverted ? currentMessages.concat(messages) : messages.concat(currentMessages)
  }

  getChildContext () {
    return {
      actionSheet: () => this._actionSheetRef,
      getLocale: this.getLocale
    }
  }

  componentDidMount () {
    const {messages, text, disableSubsituteKeyboardView = false} = this.props
    this.setIsMounted(true)
    this.initLocale()
    this.setMessages(messages || [])
    this.setTextFromProp(text)
    if (!disableSubsituteKeyboardView) {
      this.initSubsituteKeyboardView()
    }
  }

  initSubsituteKeyboardView () {
    setTimeout(() => {
      if (!this.inputToolbarRef && !this.state.isInitialized) {
        this.initSubsituteKeyboardView()
      } else {
        this.showSubsituteKeyboard()
      }
    }, 200)
  }

  componentWillUnmount () {
    this.setIsMounted(false)
  }

  componentWillReceiveProps (nextProps = {}) {
    const {messages, text} = nextProps
    this.setMessages(messages || [])
    this.setTextFromProp(text)
  }

  componentDidUpdate (prevProps, prevState) {
    if (this.state.subsituteKeyboardViewIsShowing !== prevState.subsituteKeyboardViewIsShowing) {
      this.props.keybordSubtitueSwitch(this.state.subsituteKeyboardViewIsShowing)
    }
  }

  initLocale () {
    if (this.props.locale === null || moment.locales().indexOf(this.props.locale) === -1) {
      this.setLocale('en')
    } else {
      this.setLocale(this.props.locale)
    }
  }

  setLocale (locale) {
    this._locale = locale
  }

  getLocale () {
    return this._locale
  }

  setTextFromProp (textProp) {
    // Text prop takes precedence over state.
    if (textProp !== undefined && textProp !== this.state.text) {
      this.setState({text: textProp})
    }
  }

  getTextFromProp (fallback) {
    if (this.props.text === undefined) {
      return fallback
    }
    return this.props.text
  }

  setMessages (messages) {
    this._messages = messages
  }

  getMessages () {
    return this._messages
  }

  setMaxHeight (height) {
    this._maxHeight = height
  }

  getMaxHeight () {
    return this._maxHeight
  }

  setKeyboardHeight (height) {
    this._keyboardHeight = height
  }

  getKeyboardHeight (dontForce = false) {
    if (Platform.OS === 'android' && (!this.props.forceGetKeyboardHeight || dontForce)) {
      // For android: on-screen keyboard resized main container and has own height.
      // @see https://developer.android.com/training/keyboard-input/visibility.html
      // So for calculate the messages container height ignore keyboard height.
      return 0 // this._keyboardHeight
    }
    return this._keyboardHeight
  }

  setBottomOffset (value) {
    this._bottomOffset = value
  }

  getBottomOffset () {
    return this._bottomOffset
  }

  setIsFirstLayout (value) {
    this._isFirstLayout = value
  }

  getIsFirstLayout () {
    return this._isFirstLayout
  }

  setIsTypingDisabled (value) {
    this.setState({
      typingDisabled: value
    })
  }

  getIsTypingDisabled () {
    return this.state.typingDisabled
  }

  setIsMounted (value) {
    this._isMounted = value
  }

  getIsMounted () {
    return this._isMounted
  }

  // TODO: setMinInputToolbarHeight
  getMinInputToolbarHeight () {
    return this.props.renderAccessory
      ? this.props.minInputToolbarHeight * 2
      : this.props.minInputToolbarHeight
  }

  calculateInputToolbarHeight (composerHeight) {
    return composerHeight + (this.getMinInputToolbarHeight() - MIN_COMPOSER_HEIGHT)
  }

  /**
   * Returns the height, based on current window size, without taking the keyboard into account.
   */
  getBasicMessagesContainerHeight (composerHeight = this.state.composerHeight) {
    return this.getMaxHeight() - this.calculateInputToolbarHeight(composerHeight)
  }

  /**
   * Returns the height, based on current window size, taking the keyboard into account.
   */
  getMessagesContainerHeightWithKeyboard (composerHeight = this.state.composerHeight, force = false) {
    let result = this.getBasicMessagesContainerHeight(composerHeight) - this.getKeyboardHeight() + this.getBottomOffset()
    if (result < 0 || force) {
      result = this.getBasicMessagesContainerHeight(composerHeight) - this.getKeyboardHeight(true) + this.getBottomOffset()
    }
    return result
  }

  prepareMessagesContainerHeight (value) {
    if (this.props.isAnimated === true) {
      return new Animated.Value(value)
    }
    return value
  }

  onKeyboardWillShow (e) {
    this.setIsTypingDisabled(true)
    this.setKeyboardHeight(e.endCoordinates ? e.endCoordinates.height : e.end.height)
    this.setBottomOffset(this.props.bottomOffset)
    const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard()
    if (this.props.isAnimated === true) {
      Animated.timing(this.state.messagesContainerHeight, {
        toValue: newMessagesContainerHeight,
        duration: 210
      }).start()
    } else {
      this.setState({
        messagesContainerHeight: newMessagesContainerHeight
      })
    }
  }

  onKeyboardWillHide () {
    let newMessagesContainerHeight = this.getBasicMessagesContainerHeight()

    if (this.state.subsituteKeyboardViewIsShowing) {
      if (Platform.OS === 'android') {
        this.setKeyboardHeight(330)
        setTimeout(() => {
          newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard()
          this.setState({
            messagesContainerHeight: newMessagesContainerHeight
          })
        }, 250)
      }
      return
    }
    this.setIsTypingDisabled(true)
    // this.setKeyboardHeight(0)
    this.setBottomOffset(0)
    if (this.props.isAnimated === true) {
      Animated.timing(this.state.messagesContainerHeight, {
        toValue: newMessagesContainerHeight,
        duration: 210
      }).start()
    } else {
      this.setState({
        messagesContainerHeight: newMessagesContainerHeight
      })
    }
  }

  onKeyboardDidShow (e) {
    if (Platform.OS === 'android') {
      this.onKeyboardWillShow(e)
    }
    this.setIsTypingDisabled(false)
    this.setState({
      keyboardIsShow: true,
      subsituteKeyboardViewIsShowing: false
    })
  }

  onKeyboardDidHide (e) {
    if (Platform.OS === 'android') {
      this.onKeyboardWillHide(e)
    }
    this.setIsTypingDisabled(false)
    if (!this.state.subsituteKeyboardViewIsShowing) {
      this.setState({
        keyboardIsShow: false
      })
    }
  }

  onPanResponderRelease (evt, gestureState) {
    const {moveY, dx, dy} = gestureState
    if (this.state.keyboardIsShow) {
      const keyboardHeight = this.getKeyboardHeight()
      const screenHeight = Dimensions.get('window').height
      const isJustTouch = dx < 10 && dy < 10
      const keyboardMove = moveY > screenHeight - keyboardHeight
      const offset = moveY - (screenHeight - keyboardHeight)
      if (keyboardMove) {
        if (offset > 2 * (keyboardHeight / 3)) {
          this.setState({
            subsituteKeyboardViewIsShowing: false,
            keyboardIsShow: false
          })
          this.setIsTypingDisabled(true)
          // this.setKeyboardHeight(0)
          this.setBottomOffset(0)
          const newMessagesContainerHeight = this.getBasicMessagesContainerHeight()
          if (this.props.isAnimated === true) {
            Animated.timing(this.state.messagesContainerHeight, {
              toValue: newMessagesContainerHeight,
              duration: 0
            }).start()
          } else {
            this.setState({
              messagesContainerHeight: newMessagesContainerHeight
            })
          }
        } else {
          this.setIsTypingDisabled(true)
          this.setBottomOffset(this.props.bottomOffset)
          const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard()
          if (this.props.isAnimated === true) {
            Animated.timing(this.state.messagesContainerHeight, {
              toValue: newMessagesContainerHeight,
              duration: 0
            }).start()
          } else {
            this.setState({
              messagesContainerHeight: newMessagesContainerHeight
            })
          }
        }
      } else if (isJustTouch && this.state.subsituteKeyboardViewIsShowing) {
        this.setState({
          subsituteKeyboardViewIsShowing: false,
          keyboardIsShow: false
        })
        this.setIsTypingDisabled(true)
        // this.setKeyboardHeight(0)
        this.setBottomOffset(0)
        const newMessagesContainerHeight = this.getBasicMessagesContainerHeight()
        if (this.props.isAnimated === true) {
          Animated.timing(this.state.messagesContainerHeight, {
            toValue: newMessagesContainerHeight,
            duration: 210
          }).start()
        } else {
          this.setState({
            messagesContainerHeight: newMessagesContainerHeight
          })
        }
      }
    }
  }

  onMoveShouldSetPanResponder (evt, gestureState) {
    return !(gestureState.dx === 0 && gestureState.dy === 0)
  }

  onPanResponderMove (evt, gestureState) {
    const {moveY} = gestureState
    if (this.state.keyboardIsShow) {
      const keyboardHeight = this.getKeyboardHeight()
      const screenHeight = Dimensions.get('window').height
      const keyboardMove = moveY > screenHeight - keyboardHeight
      const offset = moveY - (screenHeight - keyboardHeight)
      if (keyboardMove) {
        const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard() + offset
        if (this.props.isAnimated === true) {
          Animated.timing(this.state.messagesContainerHeight, {
            toValue: newMessagesContainerHeight,
            duration: 0
          }).start()
        } else {
          this.setState({
            messagesContainerHeight: newMessagesContainerHeight
          })
        }
      }
    }
  }

  scrollToBottom (animated = true) {
    if (this._messageContainerRef === null) {
      return
    }
    this._messageContainerRef.scrollTo({y: 0, animated})
  }

  renderMessages () {
    const AnimatedView = this.props.isAnimated === true ? Animated.View : View
    return (
      <AnimatedView
        style={{
          height: this.state.messagesContainerHeight
        }}
      >
        <MessageContainer
          {...this.props}
          invertibleScrollViewProps={this.invertibleScrollViewProps}
          messages={this.getMessages()}
          ref={(component) => (this._messageContainerRef = component)}
        />
        {this.renderChatFooter()}
      </AnimatedView>
    )
  }

  onSend (messages = [], shouldResetInputToolbar = false) {
    if (!Array.isArray(messages)) {
      messages = [messages]
    }
    messages = messages.map((message) => {
      return {
        ...message,
        user: this.props.user,
        createdAt: new Date(),
        _id: this.props.messageIdGenerator()
      }
    })

    if (shouldResetInputToolbar === true) {
      this.setIsTypingDisabled(true)
      this.resetInputToolbar()
    }

    this.props.onSend(messages)
    this.scrollToBottom()

    if (shouldResetInputToolbar === true) {
      setTimeout(() => {
        if (this.getIsMounted() === true) {
          this.setIsTypingDisabled(false)
        }
      }, 100)
    }
  }

  resetInputToolbar () {
    if (this.textInput) {
      this.textInput.clear()
      this.textInput.focus()
    }
    this.notifyInputTextReset()
    const newComposerHeight = MIN_COMPOSER_HEIGHT
    const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard(newComposerHeight, true)
    this.setState({
      text: this.getTextFromProp(''),
      composerHeight: newComposerHeight,
      messagesContainerHeight: this.prepareMessagesContainerHeight(newMessagesContainerHeight)
    })
  }

  focusTextInput () {
    if (this.textInput) {
      this.textInput.focus()
    }
  }

  onInputSizeChanged (size) {
    const add = Platform.select({
      ios: 15,
      android: 0
    })
    const newComposerHeight = Math.max(
      this.props.minComposerHeight,
      Math.min(this.props.maxComposerHeight, size.height + add)
    )
    const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard(
      newComposerHeight,
      true
    )
    this.setState({
      composerHeight: newComposerHeight,
      messagesContainerHeight: this.prepareMessagesContainerHeight(newMessagesContainerHeight)
    })
  }

  onInputTextChanged (text) {
    if (this.getIsTypingDisabled()) {
      return
    }
    if (this.props.onInputTextChanged) {
      this.props.onInputTextChanged(text)
    }
    // Only set state if it's not being overridden by a prop.
    if (this.props.text === undefined) {
      this.setState({text})
    }
  }

  notifyInputTextReset () {
    if (this.props.onInputTextChanged) {
      this.props.onInputTextChanged('')
    }
  }

  onInitialLayoutViewLayout (e) {
    const {layout} = e.nativeEvent
    if (layout.height <= 0) {
      return
    }
    this.notifyInputTextReset()
    this.setMaxHeight(layout.height)
    const newComposerHeight = MIN_COMPOSER_HEIGHT
    const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard(newComposerHeight)
    this.setState({
      isInitialized: true,
      text: this.getTextFromProp(''),
      composerHeight: newComposerHeight,
      messagesContainerHeight: this.prepareMessagesContainerHeight(newMessagesContainerHeight)
    })
  }

  onMainViewLayout (e) {
    // fix an issue when keyboard is dismissing during the initialization
    const {layout} = e.nativeEvent
    if (this.getMaxHeight() !== layout.height || this.getIsFirstLayout() === true) {
      this.setMaxHeight(layout.height)
      this.setState({
        messagesContainerHeight: this.prepareMessagesContainerHeight(this.getBasicMessagesContainerHeight())
      })
    }
    if (this.getIsFirstLayout() === true) {
      this.setIsFirstLayout(false)
    }
  }

  renderInputToolbar () {
    const inputToolbarProps = {
      ...this.props,
      text: this.getTextFromProp(this.state.text),
      composerHeight: Math.max(MIN_COMPOSER_HEIGHT, this.state.composerHeight),
      onSend: this.onSend,
      onInputSizeChanged: this.onInputSizeChanged,
      onTextChanged: this.onInputTextChanged,
      ref: (inputToolbarRef) => (this.inputToolbarRef = inputToolbarRef),
      textInputProps: {
        ...this.props.textInputProps,
        ref: (textInput) => (this.textInput = textInput),
        maxLength: this.getIsTypingDisabled() ? 0 : this.props.maxInputLength
      }
    }
    if (this.props.renderInputToolbar) {
      return this.props.renderInputToolbar(inputToolbarProps)
    }
    return (
      <InputToolbar
        {...inputToolbarProps}
      />
    )
  }

  async showSubsituteKeyboard () {
    const isShowing = this.state.subsituteKeyboardViewIsShowing
    this.setState({
      subsituteKeyboardViewIsShowing: !isShowing
    })

    if (!isShowing) {
      await this.inputToolbarRef.forcePositionStay(true)
      Keyboard.dismiss()

      setTimeout(() => {this.inputToolbarRef.forcePositionStay(false)}, 200)
      setTimeout(this.inputToolbarRef.keyboardWillShow, 210)
      if (!this.state.keyboardIsShow) {
        this.setState({
          keyboardIsShow: true
        })
        const keyboardHeight = this.getKeyboardHeight() || 330
        this.setIsTypingDisabled(true)
        this.setKeyboardHeight(keyboardHeight)
        this.setBottomOffset(this.props.bottomOffset)
        const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard()
        if (this.props.isAnimated === true) {
          Animated.timing(this.state.messagesContainerHeight, {
            toValue: newMessagesContainerHeight,
            duration: 200
          }).start()
        } else {
          this.setState({
            messagesContainerHeight: newMessagesContainerHeight
          })
        }
      }
    } else {
      this.focusTextInput()
    }

  }

  renderSubsituteKeyboardView () {
    const keyboardHeight = this.getKeyboardHeight()
    const AnimatedView = this.props.isAnimated === true ? Animated.View : View

    if (this.props.renderSubsituteKeyboardView && this.state.subsituteKeyboardViewIsShowing) {
      return (
        <AnimatedView
          style={{
            height: keyboardHeight
          }}
        >
          {this.props.renderSubsituteKeyboardView()}
        </AnimatedView>
      )
    }
  }

  renderChatFooter () {
    if (this.props.renderChatFooter) {
      const footerProps = {
        ...this.props
      }
      return this.props.renderChatFooter(footerProps)
    }
    return null
  }

  renderLoading () {
    if (this.props.renderLoading) {
      return this.props.renderLoading()
    }
    return null
  }

  render () {
    if (this.state.isInitialized === true) {
      return (
        <ActionSheet ref={(component) => (this._actionSheetRef = component)}>
          <View style={styles.container} onLayout={this.onMainViewLayout}>
            {/*<View style={styles.container} onLayout={this.onMainViewLayout} {...this._panResponder.panHandlers}>*/}
            {this.renderMessages()}
            {this.renderInputToolbar()}
            {this.renderSubsituteKeyboardView()}
          </View>
        </ActionSheet>
      )
    }
    return (
      <View style={styles.container} onLayout={this.onInitialLayoutViewLayout}>
        {this.renderLoading()}
      </View>
    )
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
})

GiftedChat.childContextTypes = {
  actionSheet: PropTypes.func,
  getLocale: PropTypes.func
}

GiftedChat.defaultProps = {
  messages: [],
  text: undefined,
  placeholder: DEFAULT_PLACEHOLDER,
  messageIdGenerator: () => uuid.v4(),
  user: {},
  onSend: () => { },
  locale: null,
  timeFormat: TIME_FORMAT,
  dateFormat: DATE_FORMAT,
  isAnimated: Platform.select({
    ios: true,
    android: false
  }),
  loadEarlier: false,
  onLoadEarlier: () => { },
  isLoadingEarlier: false,
  renderLoading: null,
  renderLoadEarlier: null,
  renderAvatar: undefined,
  showUserAvatar: false,
  onPressAvatar: null,
  renderUsernameOnMessage: false,
  renderAvatarOnTop: false,
  renderBubble: null,
  renderSystemMessage: null,
  onLongPress: null,
  renderMessage: null,
  renderMessageText: null,
  renderMessageImage: null,
  imageProps: {},
  videoProps: {},
  lightboxProps: {},
  textInputProps: {},
  listViewProps: {},
  renderCustomView: null,
  renderDay: null,
  renderTime: null,
  renderFooter: null,
  renderChatFooter: null,
  renderInputToolbar: null,
  renderComposer: null,
  renderActions: null,
  renderSend: null,
  renderAccessory: null,
  onPressActionButton: null,
  bottomOffset: 0,
  minInputToolbarHeight: 44,
  keyboardShouldPersistTaps: Platform.select({
    ios: 'never',
    android: 'always'
  }),
  onInputTextChanged: null,
  maxInputLength: null,
  forceGetKeyboardHeight: false,
  inverted: true,
  extraData: null,
  minComposerHeight: MIN_COMPOSER_HEIGHT,
  maxComposerHeight: MAX_COMPOSER_HEIGHT
}

GiftedChat.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object),
  text: PropTypes.string,
  placeholder: PropTypes.string,
  messageIdGenerator: PropTypes.func,
  user: PropTypes.object,
  onSend: PropTypes.func,
  locale: PropTypes.string,
  timeFormat: PropTypes.string,
  dateFormat: PropTypes.string,
  isAnimated: PropTypes.bool,
  loadEarlier: PropTypes.bool,
  onLoadEarlier: PropTypes.func,
  isLoadingEarlier: PropTypes.bool,
  renderLoading: PropTypes.func,
  renderLoadEarlier: PropTypes.func,
  renderAvatar: PropTypes.func,
  showUserAvatar: PropTypes.bool,
  onPressAvatar: PropTypes.func,
  renderUsernameOnMessage: PropTypes.bool,
  renderAvatarOnTop: PropTypes.bool,
  renderBubble: PropTypes.func,
  renderSystemMessage: PropTypes.func,
  onLongPress: PropTypes.func,
  renderMessage: PropTypes.func,
  renderMessageText: PropTypes.func,
  renderMessageImage: PropTypes.func,
  imageProps: PropTypes.object,
  videoProps: PropTypes.object,
  lightboxProps: PropTypes.object,
  renderCustomView: PropTypes.func,
  renderDay: PropTypes.func,
  renderTime: PropTypes.func,
  renderFooter: PropTypes.func,
  renderChatFooter: PropTypes.func,
  renderInputToolbar: PropTypes.func,
  renderComposer: PropTypes.func,
  renderActions: PropTypes.func,
  renderSend: PropTypes.func,
  renderAccessory: PropTypes.func,
  onPressActionButton: PropTypes.func,
  bottomOffset: PropTypes.number,
  minInputToolbarHeight: PropTypes.number,
  listViewProps: PropTypes.object,
  keyboardShouldPersistTaps: PropTypes.oneOf(['always', 'never', 'handled']),
  onInputTextChanged: PropTypes.func,
  maxInputLength: PropTypes.number,
  forceGetKeyboardHeight: PropTypes.bool,
  inverted: PropTypes.bool,
  textInputProps: PropTypes.object,
  extraData: PropTypes.object,
  minComposerHeight: PropTypes.number,
  maxComposerHeight: PropTypes.number
}

export {
  GiftedChat,
  Actions,
  Avatar,
  Bubble,
  SystemMessage,
  MessageImage,
  MessageText,
  Composer,
  Day,
  InputToolbar,
  LoadEarlier,
  Message,
  MessageContainer,
  Send,
  Time,
  GiftedAvatar,
  utils
}

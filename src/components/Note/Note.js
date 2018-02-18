import React from 'react';
import ReactDom from 'react-dom';
import PropTypes from 'prop-types';

const styles = require('./Note.less');

class Note extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      noteId: props.note.noteId,
      content: props.note.content,
      elementX: props.note.x,
      elementY: props.note.y,
      originX: props.note.x,
      originY: props.note.y,
      backgroundColor: props.note.backgroundColor,
      shouldRender: true
    };

    this.delete = this.delete.bind(this);
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  delete() {
    this.setState({
      shouldRender: false
    });
  }

  handleDragStart(e) {
    e.stopPropagation();
    console.log('onmousedown');
    const pageOffset = ReactDom.findDOMNode(this).getBoundingClientRect();
    this.setState({
      dragging: true,
      elementX: pageOffset.left,
      elementY: pageOffset.top,
      originX: e.clientX,
      originY: e.clientY
    });
  }

  handleDrag(e) {
    console.log('onmousemove');
    if (this.state.dragging) {
      const pageOffset = ReactDom.findDOMNode(this).getBoundingClientRect();
      this.setState({
        elementX: pageOffset.left + (e.clientX - this.state.originX),
        elementY: pageOffset.top + (e.clientY - this.state.originY),
        originX: e.clientX,
        originY: e.clientY
      });
    }

    // TODO ajax to update note on server
  }

  handleDragEnd(e) {
    console.log('onmouseup');
    this.setState({
      dragging: false
    });
  }

  handleChange(e) {
    this.setState({
      content: this.self.innerHTML
    });

    // TODO ajax to update note on server
  }

  render() {
    const {
      note
    } = this.props;

    if (this.state.shouldRender) {
      return (
        <div
          ref="note"
          id={"note-" + note.noteId}
          className={styles.note}
          style={{
            left: this.state.elementX,
            top: this.state.elementY
          }}
          // draggable={true}
          onMouseDown={this.handleDragStart}
          onMouseMove={this.handleDrag}
          onMouseUp={this.handleDragEnd}
        >
          <div className={styles.toolbar}>
            <div className={styles.btnDelete} onClick={this.delete}><span className={styles.noShow}>delete</span></div>
          </div>
          <div
            ref={e => this.self = e}
            className={styles.editable}
            contentEditable={true}
            dangerouslySetInnerHTML={{ __html: note.content }}
            onInput={this.handleChange}
            style={{
              backgroundColor: this.state.backgroundColor
            }}
          />
        </div>
      );
    } else {
      return null;
    }
  }
}

Note.propTypes = {
  note: PropTypes.object.isRequired
};

export default Note;

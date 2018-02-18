import React from 'react';
import Note from '../Note/Note';
import styles from './Corkboard.less';
const uuid = require('uuid/v4');

class Corkboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      notes: []
    };

    this.createNote = this.createNote.bind(this);
  }

  createNote(e) {
    const notes = this.state.notes.slice();
    notes.push({
      noteId: uuid(),
      content: '',
      x: e.pageX,
      y: e.pageY,
      backgroundColor: '#8db0e8'
    });
    this.setState({ notes });

    // TODO ajax to add note on server
  }

  render() {
    return (
      <div className={styles.corkboard} onDoubleClick={this.createNote}>
      {
        this.state.notes.map(note => {
          return <Note note={note} key={note.noteId} />
        })
      }
      </div>
    );
  }
}

export default Corkboard;

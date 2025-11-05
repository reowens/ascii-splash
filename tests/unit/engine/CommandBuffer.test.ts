import { CommandBuffer } from '../../../src/engine/CommandBuffer.js';

describe('CommandBuffer', () => {
  describe('Activation & Lifecycle', () => {
    it('starts in inactive state', () => {
      const buffer = new CommandBuffer();
      expect(buffer.isActive()).toBe(false);
    });

    it('activates when activate() is called', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      expect(buffer.isActive()).toBe(true);
    });

    it('initializes buffer with "0" on activation', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      expect(buffer.getBuffer()).toBe('0');
    });

    it('initializes cursor position to 1 on activation', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      expect(buffer.getCursorPos()).toBe(1);
    });

    it('deactivates when deactivate() is called', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.deactivate();
      expect(buffer.isActive()).toBe(false);
    });

    it('clears buffer on deactivation', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.deactivate();
      expect(buffer.getBuffer()).toBe('');
    });

    it('resets cursor position to 0 on deactivation', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.deactivate();
      expect(buffer.getCursorPos()).toBe(0);
    });
  });

  describe('Character Input', () => {
    it('adds character to buffer', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      expect(buffer.getBuffer()).toBe('0p');
    });

    it('adds multiple characters sequentially', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.addChar('.');
      buffer.addChar('5');
      expect(buffer.getBuffer()).toBe('0p3.5');
    });

    it('advances cursor position after adding character', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      expect(buffer.getCursorPos()).toBe(1);
      buffer.addChar('p');
      expect(buffer.getCursorPos()).toBe(2);
      buffer.addChar('3');
      expect(buffer.getCursorPos()).toBe(3);
    });

    it('inserts character at cursor position (mid-buffer)', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      // Move cursor back
      buffer.moveCursorLeft();
      // Insert 't' before '3'
      buffer.addChar('t');
      expect(buffer.getBuffer()).toBe('0pt3');
    });

    it('ignores input when inactive', () => {
      const buffer = new CommandBuffer();
      buffer.addChar('p');
      expect(buffer.getBuffer()).toBe('');
    });

    it('handles special characters and symbols', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('!');
      buffer.addChar('*');
      buffer.addChar('/');
      buffer.addChar('?');
      expect(buffer.getBuffer()).toBe('0!*/?');
    });
  });

  describe('Backspace', () => {
    it('removes character before cursor', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.backspace();
      expect(buffer.getBuffer()).toBe('0p');
    });

    it('moves cursor back after backspace', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      expect(buffer.getCursorPos()).toBe(3);
      buffer.backspace();
      expect(buffer.getCursorPos()).toBe(2);
    });

    it('cannot delete the initial "0"', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.backspace();
      expect(buffer.getBuffer()).toBe('0');
      expect(buffer.getCursorPos()).toBe(1);
    });

    it('ignores backspace when inactive', () => {
      const buffer = new CommandBuffer();
      buffer.backspace();
      expect(buffer.getBuffer()).toBe('');
    });

    it('removes character at cursor position (mid-buffer)', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.addChar('5');
      // Move cursor to middle (after 'p')
      buffer.moveCursorLeft();
      buffer.moveCursorLeft();
      // Backspace should remove 'p'
      buffer.backspace();
      expect(buffer.getBuffer()).toBe('035');
    });
  });

  describe('Cursor Movement', () => {
    it('moves cursor left', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      expect(buffer.getCursorPos()).toBe(3);
      buffer.moveCursorLeft();
      expect(buffer.getCursorPos()).toBe(2);
    });

    it('moves cursor right', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.moveCursorLeft();
      buffer.moveCursorLeft();
      expect(buffer.getCursorPos()).toBe(1);
      buffer.moveCursorRight();
      expect(buffer.getCursorPos()).toBe(2);
    });

    it('cannot move cursor left past position 1 (before "0")', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.moveCursorLeft();
      buffer.moveCursorLeft();
      buffer.moveCursorLeft();
      expect(buffer.getCursorPos()).toBe(1);
    });

    it('cannot move cursor right past buffer length', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      expect(buffer.getCursorPos()).toBe(2);
      buffer.moveCursorRight();
      buffer.moveCursorRight();
      buffer.moveCursorRight();
      expect(buffer.getCursorPos()).toBe(2);
    });

    it('cursor respects buffer boundaries during complex operations', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.addChar('5');
      // Cursor at 4
      buffer.moveCursorLeft();
      buffer.moveCursorLeft();
      // Cursor at 2
      expect(buffer.getCursorPos()).toBe(2);
      buffer.addChar('t');
      // Buffer is "0pt35", cursor at 3
      expect(buffer.getBuffer()).toBe('0pt35');
      expect(buffer.getCursorPos()).toBe(3);
    });
  });

  describe('Command Execution', () => {
    it('returns the command string when execute() is called', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      const result = buffer.execute();
      expect(result).toBe('0p3');
    });

    it('deactivates after execution', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.execute();
      expect(buffer.isActive()).toBe(false);
    });

    it('adds command to history after execution', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.execute();
      expect(buffer.getHistory()).toContain('0p3');
    });

    it('does not add empty commands to history', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.execute(); // Execute "0" only
      expect(buffer.getHistory()).toHaveLength(0);
    });

    it('does not add duplicate consecutive commands to history', () => {
      const buffer = new CommandBuffer();
      
      // First command
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.execute();
      
      // Same command again
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.execute();
      
      const history = buffer.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toBe('0p3');
    });

    it('allows duplicate non-consecutive commands in history', () => {
      const buffer = new CommandBuffer();
      
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.execute();
      
      buffer.activate();
      buffer.addChar('t');
      buffer.addChar('2');
      buffer.execute();
      
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.execute();
      
      const history = buffer.getHistory();
      expect(history).toHaveLength(3);
      expect(history).toEqual(['0p3', '0t2', '0p3']);
    });
  });

  describe('Command Cancellation', () => {
    it('deactivates when cancel() is called', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.cancel();
      expect(buffer.isActive()).toBe(false);
    });

    it('clears buffer when cancelled', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.cancel();
      expect(buffer.getBuffer()).toBe('');
    });

    it('does not add cancelled command to history', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.cancel();
      expect(buffer.getHistory()).toHaveLength(0);
    });
  });

  describe('History Navigation', () => {
    let buffer: CommandBuffer;

    beforeEach(() => {
      buffer = new CommandBuffer();
      // Populate history
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('1');
      buffer.execute();
      
      buffer.activate();
      buffer.addChar('t');
      buffer.addChar('2');
      buffer.execute();
      
      buffer.activate();
      buffer.addChar('*');
      buffer.execute();
    });

    it('previousCommand() loads last command from history', () => {
      buffer.activate();
      buffer.previousCommand();
      expect(buffer.getBuffer()).toBe('0*');
    });

    it('previousCommand() navigates backward through history', () => {
      buffer.activate();
      buffer.previousCommand();
      expect(buffer.getBuffer()).toBe('0*');
      buffer.previousCommand();
      expect(buffer.getBuffer()).toBe('0t2');
      buffer.previousCommand();
      expect(buffer.getBuffer()).toBe('0p1');
    });

    it('previousCommand() stops at oldest command', () => {
      buffer.activate();
      buffer.previousCommand();
      buffer.previousCommand();
      buffer.previousCommand();
      buffer.previousCommand();
      buffer.previousCommand();
      expect(buffer.getBuffer()).toBe('0p1');
    });

    it('nextCommand() navigates forward through history', () => {
      buffer.activate();
      buffer.previousCommand(); // 0*
      buffer.previousCommand(); // 0t2
      buffer.nextCommand(); // back to 0*
      expect(buffer.getBuffer()).toBe('0*');
    });

    it('nextCommand() resets to "0" when at end of history', () => {
      buffer.activate();
      buffer.previousCommand(); // 0*
      buffer.nextCommand(); // should reset to "0"
      expect(buffer.getBuffer()).toBe('0');
    });

    it('nextCommand() does nothing when not navigating history', () => {
      buffer.activate();
      buffer.addChar('p');
      buffer.nextCommand();
      expect(buffer.getBuffer()).toBe('0p');
    });

    it('previousCommand() does nothing when history is empty', () => {
      const newBuffer = new CommandBuffer();
      newBuffer.activate();
      newBuffer.previousCommand();
      expect(newBuffer.getBuffer()).toBe('0');
    });

    it('cursor moves to end of buffer when navigating history', () => {
      buffer.activate();
      buffer.addChar('x');
      buffer.moveCursorLeft();
      expect(buffer.getCursorPos()).toBe(1);
      buffer.previousCommand();
      expect(buffer.getCursorPos()).toBe(2); // end of "0*"
    });
  });

  describe('Timeout Management', () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('auto-cancels command after timeout (default 10s)', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      
      expect(buffer.isActive()).toBe(true);
      
      // Fast-forward time by 10 seconds
      jest.advanceTimersByTime(10000);
      
      expect(buffer.isActive()).toBe(false);
    });

    it('respects custom timeout value', () => {
      const buffer = new CommandBuffer(5000); // 5 second timeout
      buffer.activate();
      buffer.addChar('p');
      
      jest.advanceTimersByTime(4999);
      expect(buffer.isActive()).toBe(true);
      
      jest.advanceTimersByTime(1);
      expect(buffer.isActive()).toBe(false);
    });

    it('resets timeout when character is added', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      
      // Wait 9 seconds (1 second before timeout)
      jest.advanceTimersByTime(9000);
      expect(buffer.isActive()).toBe(true);
      
      // Add character (should reset timeout)
      buffer.addChar('p');
      
      // Wait another 9 seconds (should still be active)
      jest.advanceTimersByTime(9000);
      expect(buffer.isActive()).toBe(true);
      
      // Wait final 1 second to reach timeout
      jest.advanceTimersByTime(1000);
      expect(buffer.isActive()).toBe(false);
    });

    it('resets timeout when backspace is pressed', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      
      jest.advanceTimersByTime(9000);
      buffer.backspace();
      
      jest.advanceTimersByTime(9000);
      expect(buffer.isActive()).toBe(true);
      
      jest.advanceTimersByTime(1000);
      expect(buffer.isActive()).toBe(false);
    });

    it('clears timeout on manual deactivation', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.deactivate();
      
      // Advance past timeout - should not reactivate or cause issues
      jest.advanceTimersByTime(15000);
      expect(buffer.isActive()).toBe(false);
    });

    it('resets timeout when navigating history', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.execute();
      
      buffer.activate();
      jest.advanceTimersByTime(9000);
      
      buffer.previousCommand(); // Should reset timeout
      jest.advanceTimersByTime(9000);
      expect(buffer.isActive()).toBe(true);
      
      jest.advanceTimersByTime(1000);
      expect(buffer.isActive()).toBe(false);
    });
  });

  describe('History Management', () => {
    it('getHistory() returns copy of history, not reference', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.execute();
      
      const history1 = buffer.getHistory();
      const history2 = buffer.getHistory();
      
      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });

    it('limits history size to 50 commands', () => {
      const buffer = new CommandBuffer();
      
      // Add 55 commands
      for (let i = 1; i <= 55; i++) {
        buffer.activate();
        buffer.addChar('p');
        buffer.addChar(String(i % 10));
        buffer.execute();
      }
      
      const history = buffer.getHistory();
      expect(history.length).toBe(50);
    });

    it('removes oldest commands when history exceeds 50', () => {
      const buffer = new CommandBuffer();
      
      // Add 52 commands
      for (let i = 1; i <= 52; i++) {
        buffer.activate();
        buffer.addChar('c');
        buffer.addChar(String(i % 10));
        buffer.execute();
      }
      
      const history = buffer.getHistory();
      expect(history.length).toBe(50);
      // First command should be command 3 (commands 1-2 dropped)
      expect(history[0]).toBe('0c3');
      // Last command should be command 52
      expect(history[49]).toBe('0c2');
    });

    it('history persists across activate/deactivate cycles', () => {
      const buffer = new CommandBuffer();
      
      buffer.activate();
      buffer.addChar('p');
      buffer.execute();
      
      buffer.activate();
      buffer.addChar('t');
      buffer.execute();
      
      expect(buffer.getHistory()).toEqual(['0p', '0t']);
    });

    it('history is preserved after cancellation', () => {
      const buffer = new CommandBuffer();
      
      buffer.activate();
      buffer.addChar('p');
      buffer.execute();
      
      buffer.activate();
      buffer.addChar('x');
      buffer.cancel(); // Cancel, should not add to history
      
      expect(buffer.getHistory()).toEqual(['0p']);
    });
  });

  describe('Edge Cases & Integration', () => {
    it('handles rapid activate/deactivate cycles', () => {
      const buffer = new CommandBuffer();
      for (let i = 0; i < 10; i++) {
        buffer.activate();
        buffer.deactivate();
      }
      expect(buffer.isActive()).toBe(false);
      expect(buffer.getBuffer()).toBe('');
    });

    it('handles complex command sequence', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      buffer.addChar('p');
      buffer.addChar('3');
      buffer.addChar('.');
      buffer.addChar('5');
      buffer.moveCursorLeft();
      buffer.moveCursorLeft();
      buffer.backspace();
      buffer.addChar('t');
      buffer.addChar('2');
      expect(buffer.getBuffer()).toBe('0pt2.5');
    });

    it('multiple execute cycles maintain correct state', () => {
      const buffer = new CommandBuffer();
      
      for (let i = 1; i <= 5; i++) {
        buffer.activate();
        expect(buffer.isActive()).toBe(true);
        buffer.addChar('p');
        buffer.addChar(String(i));
        const result = buffer.execute();
        expect(result).toBe(`0p${i}`);
        expect(buffer.isActive()).toBe(false);
      }
      
      expect(buffer.getHistory()).toHaveLength(5);
    });

    it('handles empty buffer edge case', () => {
      const buffer = new CommandBuffer();
      expect(buffer.getBuffer()).toBe('');
      expect(buffer.getCursorPos()).toBe(0);
      expect(buffer.getHistory()).toEqual([]);
    });

    it('cursor and buffer stay synchronized', () => {
      const buffer = new CommandBuffer();
      buffer.activate();
      
      for (let i = 0; i < 10; i++) {
        buffer.addChar('x');
      }
      expect(buffer.getCursorPos()).toBe(11); // '0' + 10 'x's
      expect(buffer.getBuffer().length).toBe(11);
      
      for (let i = 0; i < 5; i++) {
        buffer.backspace();
      }
      expect(buffer.getCursorPos()).toBe(6);
      expect(buffer.getBuffer().length).toBe(6);
    });
  });
});

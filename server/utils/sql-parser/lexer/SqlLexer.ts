import { TokenType } from '../types/tokens';
import type { SqlToken, LexerOptions } from '../types/tokens';

/**
 * SQL Keywords mapping
 */
const SQL_KEYWORDS = new Map<string, TokenType>([
  // DML Keywords
  ['SELECT', TokenType.SELECT],
  ['FROM', TokenType.FROM],
  ['WHERE', TokenType.WHERE],
  ['INSERT', TokenType.INSERT],
  ['INTO', TokenType.INTO],
  ['VALUES', TokenType.VALUES],
  ['UPDATE', TokenType.UPDATE],
  ['SET', TokenType.SET],
  ['DELETE', TokenType.DELETE],
  ['MERGE', TokenType.MERGE],
  
  // Join Keywords
  ['JOIN', TokenType.JOIN],
  ['INNER', TokenType.INNER],
  ['LEFT', TokenType.LEFT],
  ['RIGHT', TokenType.RIGHT],
  ['FULL', TokenType.FULL],
  ['CROSS', TokenType.CROSS],
  ['ON', TokenType.ON],
  
  // CTE Keywords
  ['WITH', TokenType.WITH],
  ['AS', TokenType.AS],
  
  // Control Flow Keywords
  ['IF', TokenType.IF],
  ['ELSE', TokenType.ELSE],
  ['WHILE', TokenType.WHILE],
  ['BEGIN', TokenType.BEGIN],
  ['END', TokenType.END],
  ['TRY', TokenType.TRY],
  ['CATCH', TokenType.CATCH],
  ['RETURN', TokenType.RETURN],
  
  // Variable and Execution Keywords
  ['DECLARE', TokenType.DECLARE],
  ['EXEC', TokenType.EXEC],
  ['EXECUTE', TokenType.EXECUTE],
  
  // Logical Keywords
  ['EXISTS', TokenType.EXISTS],
  ['NOT', TokenType.NOT],
  ['AND', TokenType.AND],
  ['OR', TokenType.OR],
  ['IN', TokenType.IN],
  ['LIKE', TokenType.LIKE],
  ['BETWEEN', TokenType.BETWEEN],
  ['IS', TokenType.IS],
  ['NULL', TokenType.NULL],
  
  // Conditional Keywords
  ['CASE', TokenType.CASE],
  ['WHEN', TokenType.WHEN],
  ['THEN', TokenType.THEN],
  
  // Aggregation and Grouping Keywords
  ['GROUP', TokenType.GROUP],
  ['BY', TokenType.BY],
  ['HAVING', TokenType.HAVING],
  ['ORDER', TokenType.ORDER],
  ['ASC', TokenType.ASC],
  ['DESC', TokenType.DESC],
  ['DISTINCT', TokenType.DISTINCT],
  ['ALL', TokenType.ALL],
  
  // Set Operations
  ['UNION', TokenType.UNION],
  ['INTERSECT', TokenType.INTERSECT],
  ['EXCEPT', TokenType.EXCEPT],
  
  // MERGE specific
  ['USING', TokenType.USING],
  ['MATCHED', TokenType.MATCHED]
]);

/**
 * SQL Lexer for tokenizing SQL text with improved error handling
 */
export class SqlLexer {
  private readonly text: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: SqlToken[] = [];
  private readonly options: LexerOptions;

  constructor(text: string, options: LexerOptions = {}) {
    this.text = text;
    this.options = {
      includeWhitespace: false,
      includeComments: false,
      caseSensitive: false,
      ...options
    };
  }

  /**
   * Tokenize the SQL text
   */
  public tokenize(): SqlToken[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (this.position < this.text.length) {
      const token = this.nextToken();
      if (token) {
        // Filter tokens based on options
        if (token.type === TokenType.WHITESPACE && !this.options.includeWhitespace) {
          continue;
        }
        if (token.type === TokenType.COMMENT && !this.options.includeComments) {
          continue;
        }
        this.tokens.push(token);
      }
    }

    // Add EOF token
    this.tokens.push(this.createToken(TokenType.EOF, '', this.position, this.position));

    return this.tokens;
  }

  /**
   * Get the next token from the input
   */
  private nextToken(): SqlToken | null {
    if (this.position >= this.text.length) {
      return null;
    }

    const startPosition = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    // Skip whitespace
    if (this.isWhitespace(this.currentChar())) {
      return this.readWhitespace(startPosition, startLine, startColumn);
    }

    const char = this.currentChar();

    // Comments
    if (char === '-' && this.peekChar() === '-') {
      return this.readLineComment(startPosition, startLine, startColumn);
    }

    if (char === '/' && this.peekChar() === '*') {
      return this.readBlockComment(startPosition, startLine, startColumn);
    }

    // String literals
    if (char === "'" || char === '"') {
      return this.readStringLiteral(startPosition, startLine, startColumn, char);
    }

    // Bracketed identifiers
    if (char === '[') {
      return this.readBracketedIdentifier(startPosition, startLine, startColumn);
    }

    // Numbers
    if (this.isDigit(char)) {
      return this.readNumber(startPosition, startLine, startColumn);
    }

    // Parameters
    if (char === '@') {
      return this.readParameter(startPosition, startLine, startColumn);
    }

    // Identifiers and keywords
    if (this.isAlpha(char) || char === '_') {
      return this.readIdentifier(startPosition, startLine, startColumn);
    }

    // Operators and punctuation
    const operatorToken = this.readOperator(startPosition, startLine, startColumn);
    if (operatorToken) {
      return operatorToken;
    }

    // Unknown character - advance and return as unknown
    const unknownChar = this.currentChar();
    this.advance();
    return this.createToken(TokenType.UNKNOWN, unknownChar, startPosition, this.position, startLine, startColumn);
  }

  /**
   * Read whitespace characters
   */
  private readWhitespace(startPosition: number, startLine: number, startColumn: number): SqlToken {
    let value = '';
    
    while (this.position < this.text.length && this.isWhitespace(this.currentChar())) {
      value += this.currentChar();
      this.advance();
    }

    return this.createToken(TokenType.WHITESPACE, value, startPosition, this.position, startLine, startColumn);
  }

  /**
   * Read line comment (-- comment)
   */
  private readLineComment(startPosition: number, startLine: number, startColumn: number): SqlToken {
    let value = '';
    
    while (this.position < this.text.length && this.currentChar() !== '\n') {
      value += this.currentChar();
      this.advance();
    }

    return this.createToken(TokenType.COMMENT, value, startPosition, this.position, startLine, startColumn);
  }

  /**
   * Read block comment
   */
  private readBlockComment(startPosition: number, startLine: number, startColumn: number): SqlToken {
    let value = '';
    
    this.advance(); // Skip '/'
    this.advance(); // Skip '*'
    value += '/*';

    while (this.position < this.text.length - 1) {
      if (this.currentChar() === '*' && this.peekChar() === '/') {
        value += '*/';
        this.advance(); // Skip '*'
        this.advance(); // Skip '/'
        break;
      }
      value += this.currentChar();
      this.advance();
    }

    return this.createToken(TokenType.COMMENT, value, startPosition, this.position, startLine, startColumn);
  }

  /**
   * Read string literal
   */
  private readStringLiteral(startPosition: number, startLine: number, startColumn: number, quote: string): SqlToken {
    let value = '';
    
    this.advance(); // Skip opening quote
    value += quote;

    while (this.position < this.text.length) {
      const char = this.currentChar();
      
      if (char === quote) {
        value += char;
        this.advance();
        // Handle escaped quotes (double quotes)
        if (this.currentChar() === quote) {
          value += char;
          this.advance();
          continue;
        }
        break;
      }
      
      value += char;
      this.advance();
    }

    return this.createToken(TokenType.STRING_LITERAL, value, startPosition, this.position, startLine, startColumn);
  }

  /**
   * Read bracketed identifier [identifier]
   */
  private readBracketedIdentifier(startPosition: number, startLine: number, startColumn: number): SqlToken {
    let value = '';
    
    this.advance(); // Skip '['
    value += '[';

    while (this.position < this.text.length) {
      const char = this.currentChar();
      
      if (char === ']') {
        value += char;
        this.advance();
        break;
      }
      
      value += char;
      this.advance();
    }

    return this.createToken(TokenType.IDENTIFIER, value, startPosition, this.position, startLine, startColumn);
  }

  /**
   * Read number literal
   */
  private readNumber(startPosition: number, startLine: number, startColumn: number): SqlToken {
    let value = '';
    let hasDecimal = false;
    
    while (this.position < this.text.length) {
      const char = this.currentChar();
      
      if (this.isDigit(char)) {
        value += char;
        this.advance();
      } else if (char === '.' && !hasDecimal) {
        hasDecimal = true;
        value += char;
        this.advance();
      } else {
        break;
      }
    }

    return this.createToken(TokenType.NUMBER_LITERAL, value, startPosition, this.position, startLine, startColumn);
  }

  /**
   * Read parameter (@parameter)
   */
  private readParameter(startPosition: number, startLine: number, startColumn: number): SqlToken {
    let value = '';
    
    this.advance(); // Skip '@'
    value += '@';

    while (this.position < this.text.length && this.isAlphaNumeric(this.currentChar())) {
      value += this.currentChar();
      this.advance();
    }

    return this.createToken(TokenType.PARAMETER, value, startPosition, this.position, startLine, startColumn);
  }

  /**
   * Read identifier or keyword
   */
  private readIdentifier(startPosition: number, startLine: number, startColumn: number): SqlToken {
    let value = '';
    
    while (this.position < this.text.length && (this.isAlphaNumeric(this.currentChar()) || this.currentChar() === '_')) {
      value += this.currentChar();
      this.advance();
    }

    // Check if it's a keyword
    const upperValue = value.toUpperCase();
    const tokenType = SQL_KEYWORDS.get(upperValue) || TokenType.IDENTIFIER;

    return this.createToken(tokenType, value, startPosition, this.position, startLine, startColumn);
  }

  /**
   * Read operator or punctuation
   */
  private readOperator(startPosition: number, startLine: number, startColumn: number): SqlToken | null {
    const char = this.currentChar();
    const nextChar = this.peekChar();

    // Two-character operators
    if (char === '<' && nextChar === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.LESS_EQUAL, '<=', startPosition, this.position, startLine, startColumn);
    }
    if (char === '>' && nextChar === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.GREATER_EQUAL, '>=', startPosition, this.position, startLine, startColumn);
    }
    if (char === '<' && nextChar === '>') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.NOT_EQUALS, '<>', startPosition, this.position, startLine, startColumn);
    }
    if (char === '!' && nextChar === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.NOT_EQUALS, '!=', startPosition, this.position, startLine, startColumn);
    }

    // Single-character operators and punctuation
    let tokenType: TokenType;
    switch (char) {
      case '=': tokenType = TokenType.EQUALS; break;
      case '<': tokenType = TokenType.LESS_THAN; break;
      case '>': tokenType = TokenType.GREATER_THAN; break;
      case '+': tokenType = TokenType.PLUS; break;
      case '-': tokenType = TokenType.MINUS; break;
      case '*': tokenType = TokenType.MULTIPLY; break;
      case '/': tokenType = TokenType.DIVIDE; break;
      case '%': tokenType = TokenType.MODULO; break;
      case ',': tokenType = TokenType.COMMA; break;
      case ';': tokenType = TokenType.SEMICOLON; break;
      case '.': tokenType = TokenType.DOT; break;
      case '(': tokenType = TokenType.LEFT_PAREN; break;
      case ')': tokenType = TokenType.RIGHT_PAREN; break;
      case '[': tokenType = TokenType.LEFT_BRACKET; break;
      case ']': tokenType = TokenType.RIGHT_BRACKET; break;
      default: return null;
    }

    this.advance();
    return this.createToken(tokenType, char, startPosition, this.position, startLine, startColumn);
  }

  /**
   * Helper methods
   */
  private currentChar(): string {
    return this.position < this.text.length ? this.text[this.position] : '';
  }

  private peekChar(): string {
    return this.position + 1 < this.text.length ? this.text[this.position + 1] : '';
  }

  private advance(): void {
    if (this.position < this.text.length) {
      if (this.text[this.position] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.position++;
    }
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private createToken(
    type: TokenType,
    value: string,
    startPosition: number,
    endPosition: number,
    line: number = this.line,
    column: number = this.column
  ): SqlToken {
    return {
      type,
      value,
      startPosition,
      endPosition,
      line,
      column
    };
  }
} 
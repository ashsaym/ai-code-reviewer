import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Box, IconButton, Typography, Paper, Tooltip, Snackbar, Alert } from '@mui/material';
import { ContentCopy as CopyIcon, Check as CheckIcon, Code as CodeIcon } from '@mui/icons-material';

interface MarkdownRendererProps {
  content: string;
  compact?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, compact = false }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setShowSnackbar(true);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <>
      <Box
        sx={{
          width: '100%',
          '& p': {
            margin: compact ? '0.3em 0' : '0.5em 0',
            lineHeight: 1.7,
            fontSize: compact ? '0.875rem' : '0.9375rem',
          },
          '& p:first-of-type': {
            marginTop: 0,
          },
          '& p:last-of-type': {
            marginBottom: 0,
          },
          '& ul, & ol': {
            marginLeft: '1.5em',
            marginTop: '0.5em',
            marginBottom: '0.5em',
            paddingLeft: '0.5em',
          },
          '& li': {
            marginBottom: '0.3em',
            lineHeight: 1.6,
          },
          '& li > p': {
            margin: '0.2em 0',
          },
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            marginTop: '1em',
            marginBottom: '0.5em',
            fontWeight: 600,
            lineHeight: 1.3,
            color: '#1e293b',
          },
          '& h1': { fontSize: '1.75em', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.3em' },
          '& h2': { fontSize: '1.5em', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.2em' },
          '& h3': { fontSize: '1.25em' },
          '& h4': { fontSize: '1.1em' },
          '& blockquote': {
            borderLeft: '4px solid #2563eb',
            paddingLeft: '1em',
            marginLeft: 0,
            marginTop: '0.5em',
            marginBottom: '0.5em',
            color: '#64748b',
            fontStyle: 'italic',
            backgroundColor: '#f8fafc',
            padding: '0.5em 1em',
            borderRadius: '0 8px 8px 0',
          },
          '& table': {
            borderCollapse: 'collapse',
            width: '100%',
            marginTop: '0.75em',
            marginBottom: '0.75em',
            fontSize: '0.875em',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
          },
          '& th, & td': {
            border: '1px solid #e2e8f0',
            padding: '0.6em 0.8em',
            textAlign: 'left',
          },
          '& th': {
            backgroundColor: '#f8fafc',
            fontWeight: 600,
            color: '#1e293b',
          },
          '& tr:nth-of-type(even)': {
            backgroundColor: '#fafafa',
          },
          '& code': {
            backgroundColor: '#f1f5f9',
            padding: '0.15em 0.4em',
            borderRadius: '4px',
            fontSize: '0.88em',
            fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", monospace',
            border: '1px solid #e2e8f0',
            color: '#e11d48',
          },
          '& pre': {
            margin: 0,
            padding: 0,
          },
          '& pre code': {
            backgroundColor: 'transparent',
            padding: 0,
            border: 'none',
            color: 'inherit',
          },
          '& a': {
            color: '#2563eb',
            textDecoration: 'none',
            borderBottom: '1px solid transparent',
            transition: 'all 0.2s',
            '&:hover': {
              borderBottom: '1px solid #2563eb',
              color: '#1d4ed8',
            },
          },
          '& strong': {
            fontWeight: 600,
            color: '#1e293b',
          },
          '& em': {
            fontStyle: 'italic',
            color: '#475569',
          },
          '& hr': {
            border: 'none',
            borderTop: '1px solid #e2e8f0',
            margin: '1em 0',
          },
          '& img': {
            maxWidth: '100%',
            borderRadius: '8px',
          },
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const codeContent = String(children).replace(/\n$/, '');
              const lineCount = codeContent.split('\n').length;
              
              if (!inline && (match || lineCount > 1)) {
                const language = match ? match[1] : 'text';
                
                return (
                  <Paper
                    elevation={0}
                    sx={{
                      position: 'relative',
                      my: 2,
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Header with language and copy button */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f1f5f9',
                        borderBottom: '1px solid #e2e8f0',
                        px: 2,
                        py: 0.75,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CodeIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: '"Fira Code", monospace',
                            fontWeight: 600,
                            color: '#64748b',
                            textTransform: 'lowercase',
                            fontSize: '0.75rem',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {language}
                        </Typography>
                      </Box>
                      <Tooltip title={copiedCode === codeContent ? 'Copied!' : 'Copy code'}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyCode(codeContent)}
                          sx={{
                            padding: '4px',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.06)',
                            },
                          }}
                        >
                          {copiedCode === codeContent ? (
                            <CheckIcon fontSize="small" sx={{ color: '#10b981' }} />
                          ) : (
                            <CopyIcon fontSize="small" sx={{ color: '#64748b' }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    {/* Code content */}
                    <Box sx={{ overflow: 'auto', maxHeight: compact ? '400px' : '600px' }}>
                      <SyntaxHighlighter
                        style={oneLight as any}
                        language={language}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          padding: '16px 20px',
                          backgroundColor: '#f8fafc',
                          fontSize: compact ? '0.8125rem' : '0.875rem',
                          lineHeight: 1.6,
                          fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", monospace',
                        }}
                        showLineNumbers={lineCount > 5}
                        wrapLines={true}
                        lineNumberStyle={{
                          minWidth: '2.5em',
                          paddingRight: '1em',
                          color: '#94a3b8',
                          userSelect: 'none',
                        }}
                        {...props}
                      >
                        {codeContent}
                      </SyntaxHighlighter>
                    </Box>
                  </Paper>
                );
              }
              
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </Box>
      
      <Snackbar
        open={showSnackbar}
        autoHideDuration={2000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Code copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
};

export default MarkdownRenderer;

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, Avatar, Button, Collapse } from '@mui/material';
import { styled } from '@mui/material/styles';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { SQLResultsModal } from './SQLResultsModal';
import VisualizationRenderer from './VisualizationRenderer';

interface Message {
  id: string;
  type: 'user' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ChatHistoryProps {
  messages: Message[];
}

const MessagePaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  marginLeft: theme.spacing(1),
  marginRight: theme.spacing(1),
}));

const UserMessage = styled(MessagePaper)(({ theme }) => ({
  backgroundColor: '#007AFF20', // Light soft blue (iPhone blue with opacity)
  border: '1px solid #007AFF40',
  color: theme.palette.text.primary,
  marginLeft: theme.spacing(6),
  marginRight: theme.spacing(1),
  position: 'relative',
  borderRadius: '1.2rem',
  borderTopRightRadius: '0.4rem',
}));

const SystemMessage = styled(MessagePaper)(({ theme }) => ({
  backgroundColor: '#E9E9EB', // Light grey (iPhone grey)
  color: theme.palette.text.primary,
  marginRight: theme.spacing(6),
  marginLeft: theme.spacing(1),
  position: 'relative',
  borderRadius: '1.2rem',
  borderTopLeftRadius: '0.4rem',
}));

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentResults, setCurrentResults] = useState<Record<string, unknown>[] | null>(null);
  const [expandedSql, setExpandedSql] = useState<Record<string, boolean>>({});

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleViewResults = (results: Record<string, unknown>[]) => {
    setCurrentResults(results);
    setModalOpen(true);
  };

  const toggleSqlExpansion = (messageId: string) => {
    setExpandedSql((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  if (messages.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
        p={4}
        textAlign="center"
      >
        <Typography variant="h5" gutterBottom>
          Welcome to SQL-Buddy
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Ask questions about your data and get SQL queries and visualizations.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 2 }}>
        {messages.map((message) => (
          message.type === 'user' ? (
            <UserMessage key={message.id} elevation={1}>
              <Box display="flex" alignItems="center" mb={1}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                  U
                </Avatar>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
            </UserMessage>
          ) : (
            <SystemMessage key={message.id} elevation={1}>
              <Box display="flex" alignItems="center" mb={1}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'secondary.main', fontSize: '0.75rem' }}>
                  AI
                </Avatar>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>

              {/* Display SQL Results button when sqlResults are available */}
              {message.metadata?.sqlResults && message.metadata.sqlResults.length > 0 && (
                <Box mt={1} display="flex" justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DescriptionIcon />}
                    onClick={() => handleViewResults(message.metadata.sqlResults)}
                  >
                    View SQL Results
                  </Button>
                </Box>
              )}

              {/* Keep original view results button for backward compatibility */}
              {message.metadata?.queryResponse?.sql_results && !message.metadata.sqlResults && (
                <Box mt={1} display="flex" justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DescriptionIcon />}
                    onClick={() => handleViewResults(message.metadata.queryResponse.sql_results)}
                  >
                    View Results
                  </Button>
                </Box>
              )}

              {/* Display SQL query if available */}
              {message.metadata?.queryResponse?.sql_query && (
                <Box mt={1}>
                  <Button
                    size="small"
                    color="inherit"
                    endIcon={expandedSql[message.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={() => toggleSqlExpansion(message.id)}
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    {expandedSql[message.id] ? 'Hide' : 'Show'} Generated SQL
                  </Button>
                  <Collapse in={expandedSql[message.id]}>
                    <Box
                      component="pre"
                      sx={{
                        mt: 1,
                        p: 1,
                        backgroundColor: 'background.default',
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontFamily: '"Courier New", monospace',
                        overflowX: 'auto',
                      }}
                    >
                      {message.metadata.queryResponse.sql_query}
                    </Box>
                  </Collapse>
                </Box>
              )}

              {/* Render visualization if available */}
              {message.metadata?.visualization && (
                <Box mt={2} sx={{ height: '250px', width: '100%' }}>
                  <VisualizationRenderer
                    code={message.metadata.visualization.code}
                    data={message.metadata.visualization.data}
                  />
                </Box>
              )}
            </SystemMessage>
          )
        ))}
        <div ref={messagesEndRef} />
      </Box>

      <SQLResultsModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={currentResults}
      />
    </>
  );
}; 
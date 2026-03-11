import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  Chip,
  Button,
  useTheme 
} from '@mui/material';
import { 
  Schedule as ScheduleIcon,
  Check as CheckIcon,
  School as SchoolIcon,
  Book as BookIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const TodaySchedule = ({ schedule = [] }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card 
        elevation={1}
        sx={{ 
          borderRadius: 3,
          background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Today's Schedule
            </Typography>
            <Chip 
              icon={<ScheduleIcon />} 
              label={`${schedule.length} Tasks`} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Box>
          
          <List sx={{ p: 0 }}>
            {schedule.length > 0 ? (
              schedule.map((task, index) => (
                <ListItem 
                  key={index}
                  sx={{ 
                    px: 0, 
                    borderRadius: 2,
                    mb: 1,
                    bgcolor: theme.palette.background.default
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: task.completed ? theme.palette.success.light : theme.palette.primary.light }}>
                      {task.completed ? <CheckIcon /> : <SchoolIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={task.title}
                    secondary={`${task.subject} • ${task.time}`}
                  />
                </ListItem>
              ))
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>
                  No tasks scheduled for today
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/planner')}
                >
                  Create Study Plan
                </Button>
              </Box>
            )}
          </List>
          
          <Button 
            fullWidth 
            variant="outlined" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={() => navigate('/planner')}
          >
            View Full Schedule
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TodaySchedule; 
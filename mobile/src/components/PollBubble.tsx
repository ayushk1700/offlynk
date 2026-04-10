import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../store/themeStore';

interface PollOption {
    id: string;
    text: string;
    votes: string[]; // List of user IDs
}

interface Props {
    question: string;
    options: PollOption[];
    onVote: (optionId: string) => void;
}

export default function PollBubble({ question, options, onVote }: Props) {
  const { colors, fontScale } = useAppTheme();
  const myId = 'me'; // placeholder

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.question, { color: colors.text, fontSize: 16 * fontScale }]}>{question}</Text>
      
      {options.map(option => {
        const hasVoted = option.votes.includes(myId);
        const totalVotes = options.reduce((acc, curr) => acc + curr.votes.length, 0);
        const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;

        return (
          <TouchableOpacity 
            key={option.id}
            style={[styles.option, { backgroundColor: hasVoted ? colors.primary + '20' : 'transparent' }]}
            onPress={() => onVote(option.id)}
          >
            <View style={styles.optionRow}>
              <Text style={[styles.optionText, { color: colors.text }]}>{option.text}</Text>
              <Text style={[styles.voteCount, { color: colors.textMuted }]}>{option.votes.length}</Text>
            </View>
            
            <View style={styles.progressContainer}>
               <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: colors.primary }]} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 10,
    minWidth: 250
  },
  question: { fontWeight: 'bold', marginBottom: 15 },
  option: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  optionText: { fontSize: 14 },
  voteCount: { fontSize: 12 },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressBar: { height: '100%' }
});

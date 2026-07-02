/**
 * Feedback Processor - Monthly AI Performance Analysis & Auto-Improvement
 * Processes admin feedback to generate reports and auto-update prompt templates
 * 
 * @module FeedbackProcessor
 * @author K-Wise AI Integration Team
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const db = require('../config/db');
const fs = require('node:fs').promises;
const path = require('node:path');

class FeedbackProcessor {
  constructor() {
    this.feedbackStore = [];
    this.lastMonthlyReport = null;
    
    logger.info('📊 Feedback Processor initialized');
  }

  /**
   * Process incoming admin feedback
   * @param {number} recommendationId - AI recommendation ID
   * @param {Object} feedback - Feedback details
   */
  async processFeedback(recommendationId, feedback) {
    try {
      // Store in database
      await db.query(
        `INSERT INTO ai_feedback (
          recommendation_id,
          accurate,
          category,
          specific_issues,
          corrected_recommendation,
          admin_notes,
          admin_id,
          reviewed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id`,
        [
          recommendationId,
          feedback.accurate,
          feedback.category,
          JSON.stringify(feedback.specificIssues || []),
          feedback.correctedRecommendation,
          feedback.notes,
          feedback.adminId
        ]
      );
      
      // Add to in-memory store
      this.feedbackStore.push({ 
        recommendationId, 
        feedback, 
        timestamp: Date.now() 
      });
      
      // If critical issue, flag immediately
      if (
        feedback.accurate === 'false' && 
        feedback.specificIssues?.includes('missed_compatibility_issue')
      ) {
        await this.flagForImmediateReview(recommendationId, feedback);
      }
      
      logger.info('✅ Feedback processed successfully', {
        recommendationId,
        accurate: feedback.accurate,
        category: feedback.category
      });
      
    } catch (error) {
      logger.error('❌ Error processing feedback', { error: error.message });
      throw error;
    }
  }

  /**
   * Flag critical issues for immediate review
   */
  async flagForImmediateReview(recommendationId, feedback) {
    try {
      logger.warn('🚨 CRITICAL_AI_ISSUE_FLAGGED', {
        recommendationId,
        issue: feedback.specificIssues,
        category: feedback.category
      });
      
      // Store in ai_audit_logs for tracking
      await db.query(
        `INSERT INTO ai_audit_logs (
          recommendation_id,
          event_type,
          event_data,
          user_id,
          created_at
        ) VALUES ($1, 'admin_override', $2, $3, NOW())`,
        [
          recommendationId,
          JSON.stringify({
            reason: 'critical_issue',
            feedback: feedback
          }),
          feedback.adminId
        ]
      );
      
      // TODO: Send immediate notification to dev team
      // - Email alert
      // - Slack/Discord webhook
      // - SMS for production
      
    } catch (error) {
      logger.error('❌ Error flagging critical issue', { error: error.message });
    }
  }

  /**
   * Generate monthly performance report
   */
  async generateMonthlyReport() {
    try {
      logger.info('📊 Generating monthly AI feedback report...');
      
      // Get all feedback from last 30 days
      const allFeedback = await this.getFeedbackSince(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      );
      
      if (allFeedback.length === 0) {
        logger.warn('⚠️ No feedback data for monthly report');
        return null;
      }
      
      const analysis = {
        reportDate: new Date().toISOString(),
        period: 'last_30_days',
        totalReviewed: allFeedback.length,
        accuracyRate: this.calculateAccuracyRate(allFeedback),
        commonIssues: this.aggregateIssues(allFeedback),
        scenarioBreakdown: this.breakdownByScenario(allFeedback),
        improvementSuggestions: []
      };
      
      // Generate improvement suggestions
      analysis.improvementSuggestions = this.generateImprovements(analysis);
      
      // Generate updated prompt guidelines
      const updatedGuidelines = this.generatePromptGuidelines(analysis);
      
      // Save report to database
      await this.saveMonthlyReport(analysis, updatedGuidelines);
      
      this.lastMonthlyReport = analysis;
      
      logger.info('✅ Monthly report generated successfully', {
        totalReviewed: analysis.totalReviewed,
        accuracyRate: (analysis.accuracyRate * 100).toFixed(2) + '%',
        commonIssues: analysis.commonIssues.length
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('❌ Error generating monthly report', { error: error.message });
      throw error;
    }
  }

  /**
   * Get feedback since timestamp
   */
  async getFeedbackSince(timestamp) {
    try {
      const result = await db.query(
        `SELECT 
          f.*,
          r.scenario,
          r.confidence,
          r.ai_output,
          r.request_data
         FROM ai_feedback f
         JOIN ai_recommendations r ON f.recommendation_id = r.id
         WHERE f.reviewed_at >= $1
         ORDER BY f.reviewed_at DESC`,
        [new Date(timestamp)]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        recommendationId: row.recommendation_id,
        accurate: row.accurate,
        category: row.category,
        specificIssues: JSON.parse(row.specific_issues || '[]'),
        correctedRecommendation: row.corrected_recommendation,
        notes: row.admin_notes,
        scenario: row.scenario,
        confidence: row.confidence,
        aiOutput: row.ai_output,
        requestData: row.request_data,
        reviewedAt: row.reviewed_at
      }));
      
    } catch (error) {
      logger.error('❌ Error fetching feedback', { error: error.message });
      return [];
    }
  }

  /**
   * Calculate accuracy rate
   */
  calculateAccuracyRate(feedback) {
    const accurate = feedback.filter(f => f.accurate === 'true').length;
    const partially = feedback.filter(f => f.accurate === 'partially').length;
    
    // Partially accurate counts as 0.5
    return (accurate + partially * 0.5) / feedback.length;
  }

  /**
   * Aggregate common issues
   */
  aggregateIssues(feedback) {
    const issueCounts = {};
    
    feedback.forEach(f => {
      f.specificIssues?.forEach(issue => {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      });
    });
    
    return Object.entries(issueCounts)
      .map(([issue, count]) => ({
        issue,
        count,
        percentage: ((count / feedback.length) * 100).toFixed(2) + '%'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Breakdown by scenario
   */
  breakdownByScenario(feedback) {
    const scenarios = {};
    
    feedback.forEach(f => {
      if (!scenarios[f.scenario]) {
        scenarios[f.scenario] = {
          total: 0,
          accurate: 0,
          partially: 0,
          inaccurate: 0
        };
      }
      
      scenarios[f.scenario].total++;
      
      if (f.accurate === 'true') scenarios[f.scenario].accurate++;
      else if (f.accurate === 'partially') scenarios[f.scenario].partially++;
      else scenarios[f.scenario].inaccurate++;
    });
    
    return Object.entries(scenarios).map(([scenario, data]) => ({
      scenario,
      ...data,
      accuracyRate: ((data.accurate + data.partially * 0.5) / data.total * 100).toFixed(2) + '%'
    }));
  }

  /**
   * Generate improvement suggestions
   */
  generateImprovements(analysis) {
    const suggestions = [];
    
    analysis.commonIssues.forEach(({ issue, count, percentage }) => {
      if (count >= 3) { // At least 3 occurrences
        suggestions.push({
          issue,
          occurrences: count,
          severity: count >= 10 ? 'high' : count >= 5 ? 'medium' : 'low',
          recommendation: this.getRecommendationForIssue(issue)
        });
      }
    });
    
    return suggestions;
  }

  /**
   * Get recommendation for specific issue type
   */
  getRecommendationForIssue(issue) {
    const recommendations = {
      'understated_risk': 'Increase severity emphasis in prompts. Use "CRITICAL" and "WARNING" prefixes more liberally.',
      'overstated_risk': 'Add confidence thresholds. Only use strong language when confidence > 85%.',
      'missed_compatibility_issue': 'Enhance part metadata enrichment. Add more known issues to database.',
      'wrong_priority': 'Improve bottleneck analysis. Weight recommendations by actual performance impact.',
      'poor_alternative_suggestion': 'Expand alternative part database. Include more price/performance options.',
      'generic_reasoning': 'Require specific technical details. Enforce minimum 2 concrete examples per recommendation.',
      'incorrect_technical_detail': 'Validate against part metadata. Cross-reference with manufacturer specs.'
    };
    
    return recommendations[issue] || 'Review and refine prompt templates for this issue type.';
  }

  /**
   * Generate prompt guidelines from analysis
   */
  generatePromptGuidelines(analysis) {
    const guidelines = [];
    
    analysis.commonIssues.forEach(({ issue, count }) => {
      if (count >= 5) { // Only create guidelines for frequent issues
        const guideline = this.createGuideline(issue);
        if (guideline) {
          guidelines.push(guideline);
        }
      }
    });
    
    return guidelines;
  }

  /**
   * Create guideline for specific issue
   */
  createGuideline(issue) {
    const guidelineMap = {
      'understated_risk': {
        issue: 'understated_risk',
        guidance: 'When thermal or power risks are detected, emphasize severity more strongly. Use phrases like "CRITICAL: This combination has high risk of..." rather than "May experience..."',
        promptAddition: '<emphasis_guideline>For thermal/power risks with confidence >70%, use CRITICAL/WARNING prefixes and specific failure modes (e.g., "thermal throttling", "system instability")</emphasis_guideline>'
      },
      
      'generic_reasoning': {
        issue: 'generic_reasoning',
        guidance: 'Always cite specific technical evidence (VRM phases, PCB layers, sensor data) rather than generic statements',
        promptAddition: '<reasoning_guideline>Include at least 2 specific technical details per recommendation (e.g., "8-phase VRM insufficient for 253W sustained load", "2.5-slot GPU requires 3+ slot clearance")</reasoning_guideline>'
      },
      
      'missed_compatibility_issue': {
        issue: 'missed_compatibility_issue',
        guidance: 'Cross-reference known issues from community reports and manufacturer advisories',
        promptAddition: '<validation_guideline>Check extended_metadata for known_issues field. Cross-reference compatibility_logs for similar build outcomes</validation_guideline>'
      },
      
      'wrong_priority': {
        issue: 'wrong_priority',
        guidance: 'Prioritize upgrades by actual performance impact, not just raw specs',
        promptAddition: '<priority_guideline>Weight recommendations by FPS/performance gain per dollar. GPU upgrades typically yield 30-50% improvement, CPU 10-20%, RAM 5-10%</priority_guideline>'
      }
    };
    
    return guidelineMap[issue] || null;
  }

  /**
   * Save monthly report to database and file
   */
  async saveMonthlyReport(analysis, guidelines) {
    try {
      // Save to database
      await db.query(
        `INSERT INTO ai_metrics (
          scenario,
          success,
          source,
          latency_ms,
          confidence,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          'monthly_report',
          true,
          'feedback_processor',
          0,
          analysis.accuracyRate * 100,
          JSON.stringify({ analysis, guidelines })
        ]
      );
      
      // Save to file for archival
      const reportPath = path.join(
        __dirname,
        '..',
        'reports',
        `ai_monthly_report_${new Date().toISOString().split('T')[0]}.json`
      );
      
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(
        reportPath,
        JSON.stringify({ analysis, guidelines }, null, 2),
        'utf8'
      );
      
      logger.info('💾 Monthly report saved', { path: reportPath });
      
    } catch (error) {
      logger.error('❌ Error saving monthly report', { error: error.message });
    }
  }

  /**
   * Auto-apply guidelines to prompt templates
   * WARNING: This modifies promptTemplates.js - use with caution
   */
  async applyGuidelines(guidelines) {
    try {
      logger.info(`🔧 Applying ${guidelines.length} prompt guidelines...`);
      
      const templatePath = path.join(__dirname, 'promptTemplates.js');
      let templateContent = await fs.readFile(templatePath, 'utf8');
      
      guidelines.forEach(guideline => {
        // Check if guideline already exists
        if (!templateContent.includes(guideline.promptAddition)) {
          // Find system prompt section and inject guideline
          // This is a simplified implementation - production should use AST parsing
          
          logger.info(`📝 Applying guideline for: ${guideline.issue}`);
          
          // Add comment noting auto-generated guideline
          const guidelineComment = `\n// Auto-generated guideline (${new Date().toISOString().split('T')[0]}): ${guideline.guidance}\n${guideline.promptAddition}\n`;
          
          // Insert before closing of system prompt (simplified)
          // In production, use proper AST manipulation
          templateContent = templateContent.replace(
            /(<\/system_prompt>|system:)/,
            `${guidelineComment}$1`
          );
        }
      });
      
      // Backup original file
      const backupPath = templatePath + '.backup.' + Date.now();
      await fs.writeFile(backupPath, templateContent, 'utf8');
      
      logger.info('✅ Prompt guidelines applied', {
        guidelines: guidelines.length,
        backup: backupPath
      });
      
      // NOTE: Requires server restart to take effect
      logger.warn('⚠️ Server restart required for prompt changes to take effect');
      
    } catch (error) {
      logger.error('❌ Error applying guidelines', { error: error.message });
    }
  }

  /**
   * Get last monthly report
   */
  getLastReport() {
    return this.lastMonthlyReport;
  }

  /**
   * Get feedback statistics
   */
  async getStats() {
    try {
      const result = await db.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN accurate = 'true' THEN 1 ELSE 0 END) as accurate,
          SUM(CASE WHEN accurate = 'partially' THEN 1 ELSE 0 END) as partially,
          SUM(CASE WHEN accurate = 'false' THEN 1 ELSE 0 END) as inaccurate,
          category,
          DATE(reviewed_at) as date
         FROM ai_feedback
         WHERE reviewed_at >= NOW() - INTERVAL '30 days'
         GROUP BY category, DATE(reviewed_at)
         ORDER BY date DESC`,
        []
      );
      
      return {
        totalFeedback: result.rows.length,
        criticalIssues: result.rows.filter(r => r.category === 'critical').length,
        avgRating: 0, // Calculate from accurate/partially/inaccurate
        rawData: result.rows
      };
      
    } catch (error) {
      logger.error('❌ Error getting feedback stats', { error: error.message });
      // Return default stats when database unavailable
      return {
        totalFeedback: 0,
        criticalIssues: 0,
        avgRating: 0,
        rawData: []
      };
    }
  }
}

// Export singleton instance
module.exports = new FeedbackProcessor();

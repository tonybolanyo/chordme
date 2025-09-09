#!/usr/bin/env python3
"""
Performance Benchmarking Results Report Generator

This script generates comprehensive performance benchmarking reports
from the collected performance data, suitable for stakeholder review
and optimization impact analysis.
"""

import json
import os
import argparse
from datetime import datetime
from typing import Dict, List, Any
import glob

def generate_performance_report(results_file: str) -> str:
    """Generate a comprehensive performance report from benchmark results."""
    
    with open(results_file, 'r') as f:
        results = json.load(f)
    
    # Extract key information
    config = results.get('benchmark_config', {})
    timestamp = results.get('timestamp', 'Unknown')
    phases = results.get('phases', {})
    memory_analysis = results.get('memory_analysis', {})
    summary = results.get('benchmark_summary', {})
    assessment = summary.get('performance_assessment', {})
    
    report = []
    
    # Header
    report.append("# ChordMe Performance Benchmarking Report")
    report.append("=" * 50)
    report.append("")
    report.append(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"**Test Date**: {timestamp}")
    report.append(f"**Test Duration**: {summary.get('total_duration_seconds', 0):.2f} seconds")
    report.append("")
    
    # Executive Summary
    report.append("## Executive Summary")
    report.append("")
    report.append(f"**Overall Grade**: {assessment.get('overall_grade', 'Unknown')}")
    report.append(f"**Performance Score**: {assessment.get('performance_score', 0)}/100")
    report.append(f"**Enterprise Ready**: {'✅ YES' if assessment.get('meets_enterprise_requirements') else '❌ NO'}")
    report.append(f"**Metrics Collected**: {summary.get('total_metrics_collected', 0):,}")
    report.append("")
    
    # Test Configuration
    report.append("## Test Configuration")
    report.append("")
    report.append(f"- **Concurrent Users**: {config.get('max_concurrent_users', 'N/A')}")
    report.append(f"- **Test Duration**: {config.get('test_duration_minutes', 'N/A')} minutes")
    report.append(f"- **Database Records**: {config.get('database_records_target', 'N/A'):,}")
    report.append(f"- **API Base URL**: {config.get('base_url', 'N/A')}")
    report.append("")
    
    # Performance Thresholds
    report.append("## Performance Thresholds")
    report.append("")
    report.append(f"- **API Response Time**: ≤{config.get('max_api_response_time_ms', 1000)}ms")
    report.append(f"- **Database Response Time**: ≤{config.get('max_database_response_time_ms', 500)}ms")
    report.append(f"- **Collaboration Latency**: ≤{config.get('max_collaboration_latency_ms', 100)}ms")
    report.append(f"- **Memory Usage**: ≤{config.get('max_memory_usage_mb', 4096)}MB")
    report.append(f"- **Throughput**: ≥{config.get('min_throughput_ops_per_second', 100)} ops/sec")
    report.append("")
    
    # Critical Issues and Warnings
    if assessment.get('critical_issues') or assessment.get('warnings'):
        report.append("## Issues and Warnings")
        report.append("")
        
        if assessment.get('critical_issues'):
            report.append("### 🚨 Critical Issues")
            for issue in assessment['critical_issues']:
                report.append(f"- {issue}")
            report.append("")
        
        if assessment.get('warnings'):
            report.append("### ⚠️ Warnings")
            for warning in assessment['warnings']:
                report.append(f"- {warning}")
            report.append("")
    
    # Database Performance Results
    db_results = phases.get('database_performance', {})
    if db_results and db_results.get('setup_successful'):
        report.append("## Database Performance Results")
        report.append("")
        
        # Read Performance
        read_perf = db_results.get('read_performance', {})
        if read_perf:
            simple_reads = read_perf.get('simple_reads', {})
            indexed_reads = read_perf.get('indexed_reads', {})
            
            report.append("### Read Operations")
            report.append("| Operation Type | Avg Time (ms) | P95 Time (ms) | Max Time (ms) | Operations |")
            report.append("|----------------|---------------|---------------|---------------|------------|")
            report.append(f"| Simple Reads | {simple_reads.get('avg_ms', 0):.2f} | {simple_reads.get('p95_ms', 0):.2f} | {simple_reads.get('max_ms', 0):.2f} | {simple_reads.get('operations_tested', 0)} |")
            report.append(f"| Indexed Reads | {indexed_reads.get('avg_ms', 0):.2f} | {indexed_reads.get('p95_ms', 0):.2f} | {indexed_reads.get('max_ms', 0):.2f} | {indexed_reads.get('operations_tested', 0)} |")
            report.append("")
        
        # Write Performance
        write_perf = db_results.get('write_performance', {})
        if write_perf:
            single_inserts = write_perf.get('single_inserts', {})
            batch_inserts = write_perf.get('batch_inserts', {})
            
            report.append("### Write Operations")
            report.append("| Operation Type | Avg Time (ms) | P95 Time (ms) | Max Time (ms) | Operations |")
            report.append("|----------------|---------------|---------------|---------------|------------|")
            report.append(f"| Single Inserts | {single_inserts.get('avg_ms', 0):.2f} | {single_inserts.get('p95_ms', 0):.2f} | {single_inserts.get('max_ms', 0):.2f} | {single_inserts.get('operations_tested', 0)} |")
            report.append(f"| Batch Inserts | {batch_inserts.get('avg_ms', 0):.2f} | {batch_inserts.get('p95_ms', 0):.2f} | {batch_inserts.get('max_ms', 0):.2f} | {batch_inserts.get('operations_tested', 0)} |")
            report.append("")
        
        # Search Performance
        search_perf = db_results.get('search_performance', {})
        if search_perf:
            text_search = search_perf.get('text_search', {})
            report.append("### Search Operations")
            report.append(f"- **Text Search Average**: {text_search.get('avg_ms', 0):.2f}ms")
            report.append(f"- **Text Search P95**: {text_search.get('p95_ms', 0):.2f}ms")
            report.append(f"- **Operations Tested**: {text_search.get('operations_tested', 0)}")
            report.append("")
    
    # API Performance Results
    api_results = phases.get('api_performance', {})
    if api_results:
        report.append("## API Performance Results")
        report.append("")
        report.append("| Endpoint | Avg Time (ms) | P95 Time (ms) | Max Time (ms) | Success Rate | Threshold Met |")
        report.append("|----------|---------------|---------------|---------------|--------------|---------------|")
        
        for endpoint, metrics in api_results.items():
            if isinstance(metrics, dict) and 'avg_response_time_ms' in metrics:
                avg_time = metrics.get('avg_response_time_ms', 0)
                p95_time = metrics.get('p95_response_time_ms', 0)
                max_time = metrics.get('max_response_time_ms', 0)
                success_rate = metrics.get('success_rate', 0) * 100
                threshold_met = "✅" if metrics.get('meets_threshold', False) else "❌"
                
                report.append(f"| {endpoint} | {avg_time:.2f} | {p95_time:.2f} | {max_time:.2f} | {success_rate:.1f}% | {threshold_met} |")
        
        report.append("")
    
    # Load Testing Results
    load_results = phases.get('load_testing', {})
    if load_results and 'concurrent_load' in load_results:
        load_data = load_results['concurrent_load']
        report.append("## Load Testing Results")
        report.append("")
        report.append(f"- **Concurrent Users**: {load_data.get('concurrent_users', 0)}")
        report.append(f"- **Total Operations**: {load_data.get('total_operations', 0):,}")
        report.append(f"- **Test Duration**: {load_data.get('test_duration_seconds', 0):.2f} seconds")
        report.append(f"- **Throughput**: {load_data.get('throughput_ops_per_second', 0):.2f} ops/sec")
        report.append(f"- **Average Response Time**: {load_data.get('avg_response_time_ms', 0):.2f}ms")
        report.append(f"- **P95 Response Time**: {load_data.get('p95_response_time_ms', 0):.2f}ms")
        report.append("")
    
    # Memory Analysis
    if memory_analysis:
        report.append("## Memory Analysis")
        report.append("")
        report.append(f"- **Peak Memory Usage**: {memory_analysis.get('peak_memory_mb', 0):.2f}MB")
        report.append(f"- **Memory Growth**: {memory_analysis.get('memory_growth_mb', 0):.2f}MB")
        report.append(f"- **Memory Leak Detected**: {'❌ YES' if memory_analysis.get('memory_leak_detected') else '✅ NO'}")
        report.append(f"- **Average Memory Usage**: {memory_analysis.get('avg_memory_mb', 0):.2f}MB")
        report.append(f"- **Memory Trend**: {memory_analysis.get('memory_trend', 'Unknown').title()}")
        report.append("")
        
        stability = memory_analysis.get('memory_stability', {})
        if stability:
            report.append("### Memory Stability")
            report.append(f"- **Range**: {stability.get('range_mb', 0):.2f}MB")
            report.append(f"- **Standard Deviation**: {stability.get('std_dev_mb', 0):.2f}MB")
            report.append("")
    
    # Collaboration Performance
    collab_results = phases.get('collaboration_performance', {})
    if collab_results:
        room_creation = collab_results.get('room_creation', {})
        if room_creation:
            report.append("## Collaboration Performance")
            report.append("")
            report.append(f"- **Room Creation Average**: {room_creation.get('avg_latency_ms', 0):.2f}ms")
            report.append(f"- **Room Creation P95**: {room_creation.get('p95_latency_ms', 0):.2f}ms")
            report.append(f"- **Rooms Created**: {room_creation.get('rooms_created', 0)}")
            report.append(f"- **Meets Threshold**: {'✅ YES' if room_creation.get('meets_threshold') else '❌ NO'}")
            report.append("")
    
    # Recommendations
    report.append("## Recommendations")
    report.append("")
    
    if assessment.get('meets_enterprise_requirements'):
        report.append("### ✅ Performance Status: APPROVED")
        report.append("The system meets all enterprise performance requirements and is ready for production deployment.")
        report.append("")
    else:
        report.append("### ⚠️ Performance Status: REQUIRES OPTIMIZATION")
        report.append("The following optimizations are recommended before production deployment:")
        report.append("")
        
        # Generate specific recommendations based on issues
        for issue in assessment.get('critical_issues', []):
            if 'API response time' in issue:
                report.append("- **API Optimization**: Implement response caching and optimize slow endpoints")
            elif 'Database' in issue:
                report.append("- **Database Optimization**: Add indexes, optimize queries, implement connection pooling")
            elif 'Memory' in issue:
                report.append("- **Memory Optimization**: Fix memory leaks, optimize memory usage patterns")
            elif 'Success rate' in issue:
                report.append("- **Reliability Improvement**: Investigate and fix API failures")
        
        report.append("")
    
    # General optimization recommendations
    report.append("### General Optimization Recommendations")
    report.append("")
    report.append("1. **Caching Strategy**: Implement Redis/Memcached for frequently accessed data")
    report.append("2. **Database Indexing**: Optimize database indexes based on query patterns")
    report.append("3. **API Rate Limiting**: Implement proper rate limiting to prevent abuse")
    report.append("4. **Monitoring Setup**: Deploy continuous performance monitoring")
    report.append("5. **Load Balancing**: Consider load balancing for high-traffic scenarios")
    report.append("")
    
    # Next Steps
    report.append("## Next Steps")
    report.append("")
    report.append("1. **Address Critical Issues**: Resolve all critical performance issues identified")
    report.append("2. **Implement Optimizations**: Apply recommended optimizations")
    report.append("3. **Re-test Performance**: Run benchmark tests after optimizations")
    report.append("4. **Deploy Monitoring**: Set up continuous performance monitoring")
    report.append("5. **Schedule Regular Reviews**: Establish regular performance review cycles")
    report.append("")
    
    # Footer
    report.append("---")
    report.append("")
    report.append("*This report was automatically generated by the ChordMe Performance Benchmarking System.*")
    report.append("")
    report.append(f"**Report File**: {results_file}")
    report.append(f"**Generated**: {datetime.now().isoformat()}")
    
    return "\n".join(report)


def find_latest_results() -> str:
    """Find the most recent benchmark results file."""
    pattern = "comprehensive_performance_benchmark_*.json"
    files = glob.glob(pattern)
    
    if not files:
        raise FileNotFoundError("No benchmark results files found")
    
    # Sort by modification time, return newest
    latest_file = max(files, key=os.path.getmtime)
    return latest_file


def main():
    """Main function for report generation."""
    parser = argparse.ArgumentParser(description="Generate Performance Benchmarking Report")
    parser.add_argument("--input", help="Input benchmark results JSON file")
    parser.add_argument("--output", help="Output report file (default: auto-generated)")
    parser.add_argument("--format", choices=["markdown", "html"], default="markdown", help="Output format")
    
    args = parser.parse_args()
    
    # Find input file
    if args.input:
        if not os.path.exists(args.input):
            print(f"Error: Input file '{args.input}' not found")
            return 1
        results_file = args.input
    else:
        try:
            results_file = find_latest_results()
            print(f"Using latest results file: {results_file}")
        except FileNotFoundError as e:
            print(f"Error: {e}")
            return 1
    
    # Generate report
    try:
        report_content = generate_performance_report(results_file)
        
        # Determine output file
        if args.output:
            output_file = args.output
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            extension = "md" if args.format == "markdown" else "html"
            output_file = f"performance_report_{timestamp}.{extension}"
        
        # Convert to HTML if requested
        if args.format == "html":
            try:
                import markdown
                html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>ChordMe Performance Benchmarking Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .success {{ color: green; }}
        .warning {{ color: orange; }}
        .error {{ color: red; }}
    </style>
</head>
<body>
{markdown.markdown(report_content, extensions=['tables'])}
</body>
</html>
"""
                report_content = html_content
            except ImportError:
                print("Warning: markdown library not found, outputting as plain text")
        
        # Write report
        with open(output_file, 'w') as f:
            f.write(report_content)
        
        print(f"Performance report generated: {output_file}")
        
        # Print summary to console
        print("\n" + "="*60)
        print("PERFORMANCE BENCHMARKING REPORT SUMMARY")
        print("="*60)
        
        with open(results_file, 'r') as f:
            results = json.load(f)
        
        assessment = results.get('benchmark_summary', {}).get('performance_assessment', {})
        print(f"Overall Grade: {assessment.get('overall_grade', 'Unknown')}")
        print(f"Performance Score: {assessment.get('performance_score', 0)}/100")
        print(f"Enterprise Ready: {'YES' if assessment.get('meets_enterprise_requirements') else 'NO'}")
        
        if assessment.get('critical_issues'):
            print(f"Critical Issues: {len(assessment['critical_issues'])}")
        
        print(f"Full Report: {output_file}")
        
        return 0
        
    except Exception as e:
        print(f"Error generating report: {e}")
        return 1


if __name__ == "__main__":
    exit(main())